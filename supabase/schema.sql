-- Foundation schema for RAS: Mission Impossible. (Registration is external now; the `registrations` table is optional/unused by the frontend.) Run in the Supabase SQL editor.
-- Roles live in `profiles`, which users can READ (own row) but never WRITE from the client.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('team','admin')),
  team_id uuid
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  college text not null,
  leader_name text not null,
  leader_email text not null,
  leader_phone text not null,
  member_names text[] not null,
  status text not null default 'submitted' check (status in ('draft','submitted','pending_approval','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  -- enforce 3-4 members total (leader + others)
  constraint member_count check (array_length(member_names,1) between 2 and 3)
);

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

alter table public.profiles enable row level security;
alter table public.registrations enable row level security;

create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "admins read profiles" on public.profiles for select using (public.is_admin());

-- Anyone may submit a registration request, but only as 'submitted'. Only admins can read or change them.
create policy "public can submit" on public.registrations for insert to anon, authenticated
  with check (status = 'submitted');
create policy "admins read registrations" on public.registrations for select using (public.is_admin());
create policy "admins update registrations" on public.registrations for update using (public.is_admin());

-- Make the first organiser an admin (replace the UUID with their auth.users id):
-- insert into public.profiles (id, role) values ('00000000-0000-0000-0000-000000000000', 'admin');

-- ===== Round timers (authoritative). Clients can only READ their own team's timer. =====
-- Start / pause / resume / extend are organiser actions and must go through server functions that check is_admin().
-- Submissions must be accepted or rejected by comparing now() with deadline_at INSIDE the submit function,
-- never by trusting the browser's countdown.
create table public.round_timers (
  team_id uuid not null,
  round_id text not null,
  status text not null default 'not_started' check (status in ('not_started','ready','active','paused','expired','completed')),
  duration_ms bigint,
  started_at timestamptz,
  deadline_at timestamptz,
  paused_remaining_ms bigint,
  primary key (team_id, round_id)
);
alter table public.round_timers enable row level security;
create policy "team reads own timers" on public.round_timers for select
  using (team_id = (select team_id from public.profiles where id = auth.uid()));
create policy "admins read timers" on public.round_timers for select using (public.is_admin());
-- (No insert/update/delete policies: clients cannot write timers.)

create or replace function public.get_round_timer(p_round text) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'status', coalesce(t.status, 'not_started'),
    'started_at', t.started_at, 'deadline_at', t.deadline_at,
    'duration_ms', t.duration_ms, 'paused_remaining_ms', t.paused_remaining_ms,
    'server_now', now())
  from (select 1) d
  left join public.round_timers t
    on t.round_id = p_round
   and t.team_id = (select team_id from public.profiles where id = auth.uid())
$$;

-- TODO (next phase): verify_checkpoint(p_token text) -> jsonb { result: 'valid'|'invalid'|'already_processed'|'wrong_stage'|'not_authorised' }
-- Must validate the opaque token, team eligibility, current stage and replay rules, and record the scan atomically.

-- ===== Gameplay window (SERVER-ENFORCED). The frontend gate is only a courtesy; this is the real check. =====
create table public.gameplay_settings (
  id boolean primary key default true check (id), -- single row
  enabled boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  override_mode text check (override_mode in ('open','closed','extend')),
  override_until timestamptz,
  confirmed boolean not null default false
);
insert into public.gameplay_settings (starts_at, ends_at, confirmed)
values ('2026-10-24T08:30:00+05:30', '2026-10-24T11:30:00+05:30', false); -- PROVISIONAL: confirm with organisers
alter table public.gameplay_settings enable row level security; -- no client policies: read via function, change via admin-only server function

create or replace function public.gameplay_state() returns text
language sql security definer set search_path = public stable as $$
  select case
    when not g.enabled then 'disabled'
    when g.override_mode = 'closed' then 'closed'
    when g.override_mode = 'open' and (g.override_until is null or now() < g.override_until) then 'open'
    when g.starts_at is null or g.ends_at is null then 'unconfigured'
    when now() < g.starts_at then 'locked'
    when now() < greatest(g.ends_at, case when g.override_mode = 'extend' then coalesce(g.override_until, g.ends_at) end) then 'open'
    else 'closed' end
  from public.gameplay_settings g
$$;

-- Display data for the landing page (includes the server clock so devices with wrong clocks still agree).
create or replace function public.get_gameplay_status() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('enabled', enabled, 'starts_at', starts_at, 'ends_at', ends_at,
    'override_mode', override_mode, 'override_until', override_until, 'confirmed', confirmed,
    'state', public.gameplay_state(), 'server_now', now())
  from public.gameplay_settings
$$;
grant execute on function public.get_gameplay_status() to anon, authenticated;

-- CALL THIS at the top of EVERY gameplay function (get_round_timer, verify_checkpoint, submit_answer, ...).
create or replace function public.assert_gameplay_open() returns void
language plpgsql security definer set search_path = public stable as $$
begin
  if public.gameplay_state() <> 'open' then raise exception 'gameplay_closed' using errcode = 'P0001'; end if;
end $$;
-- Also add `perform public.assert_gameplay_open();` to get_round_timer above.

-- Team overview for the organiser table (admins only via RLS on underlying tables / a security-invoker view).
-- create view public.team_overview as select ... ;  -- columns: id, team_name, team_code, college, stage, status

-- ===== Teams + ONE LOGIN PER TEAM (server-enforced) =====
-- TODO(BACKEND): a team has ONE shared account. Only one live session per team at a time.
-- A session is "live" while its last_seen is newer than the lease (90 s here). The browser heartbeats every 15 s.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,      -- e.g. 'RAS-001' (shown as the team ID)
  college text
);
-- Team NAME is the participant login identifier, so it must be unique regardless of case or stray spaces.
create unique index teams_name_unique on public.teams (lower(btrim(name)));
alter table public.teams enable row level security;
create policy "team reads own team" on public.teams for select
  using (id = (select team_id from public.profiles where id = auth.uid()));
create policy "admins read teams" on public.teams for select using (public.is_admin());

create table public.team_sessions (
  team_id uuid primary key references public.teams(id) on delete cascade,
  session_id uuid not null,
  device text,
  claimed_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.team_sessions enable row level security; -- no client policies: only the functions below touch it

-- Atomic claim: succeeds only if there is no row, or the existing one is stale. Otherwise 'team_session_active'.
create or replace function public.claim_team_session(p_device text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_sid uuid := gen_random_uuid(); v_n int;
begin
  select team_id into v_team from public.profiles where id = auth.uid() and role = 'team';
  if v_team is null then return jsonb_build_object('ok', false, 'reason', 'not_a_team'); end if;
  insert into public.team_sessions (team_id, session_id, device) values (v_team, v_sid, p_device)
  on conflict (team_id) do update
    set session_id = excluded.session_id, device = excluded.device, claimed_at = now(), last_seen = now()
    where public.team_sessions.last_seen < now() - interval '90 seconds';
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'reason', 'team_session_active'); end if;
  return jsonb_build_object('ok', true, 'session_id', v_sid);
end $$;

create or replace function public.heartbeat_team_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_n int;
begin
  select team_id into v_team from public.profiles where id = auth.uid() and role = 'team';
  update public.team_sessions set last_seen = now() where team_id = v_team and session_id = p_session_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('valid', false, 'reason', 'displaced'); end if;
  return jsonb_build_object('valid', true);
end $$;

create or replace function public.release_team_session(p_session_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.team_sessions where session_id = p_session_id
    and team_id = (select team_id from public.profiles where id = auth.uid())
$$;

-- Organiser reset for a locked-out team (call from an admin-only server function; check is_admin()).
create or replace function public.admin_reset_team_session(p_team_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.team_sessions where team_id = p_team_id;
end $$;

-- IMPORTANT: a blocked second device still holds a valid login (JWT). So EVERY gameplay RPC must also prove the caller
-- owns the live session, otherwise the "one login per team" rule can be bypassed by calling the API directly.
-- TODO(BACKEND): add p_session_id uuid to gameplay RPCs (get_round_timer, verify_checkpoint, submit_answer, ...) and call this first.
create or replace function public.assert_active_team_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = public stable as $$
begin
  if not exists (select 1 from public.team_sessions s join public.profiles p on p.team_id = s.team_id
                 where p.id = auth.uid() and s.session_id = p_session_id
                   and s.last_seen > now() - interval '90 seconds') then
    raise exception 'no_active_team_session' using errcode = 'P0001';
  end if;
end $$;

-- ===== MISSION: four sequential questions, location hints, component recovery (SERVER-AUTHORITATIVE) =====
-- TODO(BACKEND): written to match the frontend contract in src/lib/missionApi.js. NOT yet run against a live database.
-- Needs: create extension if not exists pgcrypto;  (for token hashing)
-- Organisers supply ALL content (questions, accepted answers, hints, locations). Nothing here is real event content.
-- Team browsers must NEVER read these tables directly: RLS is enabled with NO client policies; access is via the functions below.

create table public.mission_settings (
  id boolean primary key default true check (id),
  progression_mode text not null default 'answer' check (progression_mode in ('answer','recovery','answer_and_approval')),
  hint_reveal text not null default 'on_correct_answer' check (hint_reveal in ('on_correct_answer','organiser_release'))
);
insert into public.mission_settings default values;

create table public.questions (
  idx int primary key check (idx between 1 and 4),
  active boolean not null default false,
  title text not null default '', body text not null default '',
  type text not null default 'text' check (type in ('text','choice')),
  options jsonb not null default '[]', attachments jsonb not null default '[]',
  case_sensitive boolean not null default false,
  attempts_allowed int,            -- null = unlimited
  penalty int,                     -- null = none; applied only if set (scoring not built yet)
  round_id int                     -- optional link to an official round; relationship NOT confirmed, leave null
);
create table public.question_secrets (idx int primary key references public.questions(idx), accepted_answers text[] not null default '{}');
create table public.question_hints (idx int primary key references public.questions(idx), hint_text text not null default '');
create table public.components (
  idx int primary key references public.questions(idx),
  component_code text, location_description text,
  method text not null default 'qr' check (method in ('qr','organiser_confirms')),
  required_for_progression boolean not null default true,
  token_hash text,                 -- sha256 of an opaque, random QR token; never store the raw token
  active boolean not null default true
);
create table public.team_progress (team_id uuid not null references public.teams(id) on delete cascade, idx int not null references public.questions(idx),
  solved_at timestamptz, hint_released boolean not null default false, primary key (team_id, idx));
create table public.team_attempts (id bigserial primary key, team_id uuid not null, idx int not null, answer text not null,
  result text not null, submitted_at timestamptz not null default now());
create table public.component_recoveries (team_id uuid not null, idx int not null, via text not null check (via in ('qr','organiser')),
  recovered_at timestamptz not null default now(), approved_by uuid, primary key (team_id, idx));
create table public.audit_log (id bigserial primary key, at timestamptz not null default now(), actor uuid, action text not null, detail jsonb);
alter table public.mission_settings, public.questions, public.question_secrets, public.question_hints, public.components,
  public.team_progress, public.team_attempts, public.component_recoveries, public.audit_log enable row level security;

create or replace function public.current_team_id() returns uuid
language sql security definer set search_path = public stable as
$$ select team_id from public.profiles where id = auth.uid() and role = 'team' $$;

-- Has question p_idx been "cleared" so p_idx+1 may unlock? Depends on the organiser-chosen progression mode.
create or replace function public.question_cleared(p_team uuid, p_idx int) returns boolean
language plpgsql security definer set search_path = public stable as $$
declare m text; solved boolean; rec text; req boolean;
begin
  select progression_mode into m from public.mission_settings;
  select exists (select 1 from public.team_progress where team_id = p_team and idx = p_idx and solved_at is not null) into solved;
  select via into rec from public.component_recoveries where team_id = p_team and idx = p_idx;
  select coalesce(required_for_progression, true) into req from public.components where idx = p_idx;
  req := coalesce(req, true);
  if m = 'answer' then return solved;
  elsif m = 'recovery' then return case when req then rec is not null else solved end;
  else return solved and (not req or rec = 'organiser'); end if;
end $$;

create or replace function public.question_unlocked(p_team uuid, p_idx int) returns boolean
language plpgsql security definer set search_path = public stable as $$
begin
  if not coalesce((select active from public.questions where idx = p_idx), false) then return false; end if;
  if p_idx = 1 then return true; end if;
  return public.question_unlocked(p_team, p_idx - 1) and public.question_cleared(p_team, p_idx - 1);
end $$;

-- Team view. Locked questions return ONLY {index, status:'locked'}. Hints/locations/answers are never sent early.
create or replace function public.get_mission_state(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare t uuid := public.current_team_id(); s public.mission_settings; items jsonb := '[]'; i int; q public.questions;
  solved boolean; hint_on boolean; rec text; cur int; n_solved int := 0; all_cleared boolean := true; c public.components;
begin
  perform public.assert_gameplay_open(); perform public.assert_active_team_session(p_session_id);
  select * into s from public.mission_settings;
  for i in 1..4 loop
    select * into q from public.questions where idx = i;
    if not found or not public.question_unlocked(t, i) then
      items := items || jsonb_build_object('index', i, 'status', 'locked'); all_cleared := false; continue;
    end if;
    select exists (select 1 from public.team_progress where team_id = t and idx = i and solved_at is not null) into solved;
    select * into c from public.components where idx = i;
    select via into rec from public.component_recoveries where team_id = t and idx = i;
    hint_on := case when s.hint_reveal = 'on_correct_answer' then solved
                    else coalesce((select hint_released from public.team_progress where team_id = t and idx = i), false) end;
    if solved then n_solved := n_solved + 1; elsif cur is null then cur := i; end if;
    if not public.question_cleared(t, i) then all_cleared := false; end if;
    items := items || jsonb_build_object(
      'index', i, 'status', case when solved then 'solved' else 'available' end,
      'title', q.title, 'body', q.body, 'type', q.type,
      'options', case when q.type = 'choice' then q.options else '[]'::jsonb end, 'attachments', q.attachments,
      'attemptsUsed', (select count(*) from public.team_attempts where team_id = t and idx = i),
      'attemptsAllowed', q.attempts_allowed,
      'hint', case when hint_on then jsonb_build_object('status','unlocked','text',(select hint_text from public.question_hints where idx = i))
                   else jsonb_build_object('status','hidden') end,
      'component', jsonb_build_object('id', c.component_code, 'method', c.method, 'requiredForProgression', c.required_for_progression,
                                      'status', case when rec is null then 'not_recovered' else 'recovered' end, 'via', rec),
      'nextUnlocked', i < 4 and public.question_unlocked(t, i + 1));
  end loop;
  return jsonb_build_object('settings', jsonb_build_object('progressionMode', s.progression_mode, 'hintReveal', s.hint_reveal),
    'questions', items, 'currentIndex', cur, 'solvedCount', n_solved, 'complete', n_solved = 4 and all_cleared);
end $$;

-- Atomic + idempotent: an advisory lock serialises repeats, and team_progress uses ON CONFLICT DO NOTHING.
-- TODO(BACKEND): also compare now() with the question's timer deadline (round_timers key 'question-N') and return 'late' if configured.
create or replace function public.submit_answer(p_session_id uuid, p_question int, p_answer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public.current_team_id(); q public.questions; ok boolean; used int;
begin
  perform public.assert_gameplay_open(); perform public.assert_active_team_session(p_session_id);
  perform pg_advisory_xact_lock(hashtextextended(t::text || ':' || p_question, 0));
  select * into q from public.questions where idx = p_question;
  if not found or not public.question_unlocked(t, p_question) then return jsonb_build_object('result', 'locked'); end if;
  if exists (select 1 from public.team_progress where team_id = t and idx = p_question and solved_at is not null) then
    return jsonb_build_object('result', 'already_solved'); end if;
  select count(*) into used from public.team_attempts where team_id = t and idx = p_question;
  if q.attempts_allowed is not null and used >= q.attempts_allowed then return jsonb_build_object('result', 'attempts_exhausted'); end if;
  select exists (select 1 from public.question_secrets s where s.idx = p_question and exists (
    select 1 from unnest(s.accepted_answers) a
    where (case when q.case_sensitive then regexp_replace(btrim(a), '\s+', ' ', 'g') = regexp_replace(btrim(p_answer), '\s+', ' ', 'g')
                else lower(regexp_replace(btrim(a), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(p_answer), '\s+', ' ', 'g')) end))) into ok;
  insert into public.team_attempts (team_id, idx, answer, result) values (t, p_question, p_answer, case when ok then 'correct' else 'incorrect' end);
  if ok then insert into public.team_progress (team_id, idx, solved_at) values (t, p_question, now())
    on conflict (team_id, idx) do update set solved_at = coalesce(public.team_progress.solved_at, now()); end if;
  return jsonb_build_object('result', case when ok then 'correct' else 'incorrect' end,
    'state', case when ok then public.get_mission_state(p_session_id) end);
end $$;

create or replace function public.list_my_submissions(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  perform public.assert_active_team_session(p_session_id);
  return coalesce((select jsonb_agg(jsonb_build_object('questionIndex', idx, 'submittedAt', submitted_at, 'answer', answer, 'result', result) order by submitted_at desc)
    from public.team_attempts where team_id = public.current_team_id()), '[]');
end $$;

create or replace function public.verify_checkpoint(p_session_id uuid, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public.current_team_id(); c public.components; h text := encode(digest(p_token, 'sha256'), 'hex');
begin
  perform public.assert_gameplay_open(); perform public.assert_active_team_session(p_session_id);
  select * into c from public.components where token_hash = h and method = 'qr' and active;
  if not found then return jsonb_build_object('result', 'invalid'); end if;
  if not public.question_unlocked(t, c.idx) then return jsonb_build_object('result', 'wrong_stage'); end if;
  insert into public.component_recoveries (team_id, idx, via) values (t, c.idx, 'qr') on conflict do nothing;
  if not found then return jsonb_build_object('result', 'already_processed'); end if;
  return jsonb_build_object('result', 'valid', 'questionIndex', c.idx, 'state', public.get_mission_state(p_session_id));
end $$;

-- TODO(BACKEND): admin-only functions the organiser UI calls (each must check is_admin() and insert into audit_log):
--   admin_get_settings(), admin_save_settings(p_settings jsonb), admin_list_questions(), admin_save_question(p_index, p_question jsonb),
--   admin_list_teams(), admin_approve_recovery(p_team_code, p_index), admin_release_hint(p_team_code, p_index),
--   admin_reset_team(p_team_code), admin_audit(). Return shapes: see src/lib/mock/mockBackend.js (the mock mirrors them).


-- ===== Mission briefing completion (per team) =====
-- Presentation state only. It must never start a timer, unlock a question, reveal a hint or change any score.
create table if not exists public.team_briefing (
  team_id uuid primary key references public.teams(id) on delete cascade,
  completed_at timestamptz not null default now()
);
alter table public.team_briefing enable row level security;
-- Teams read only their own row; NO insert/update policy: writes go through complete_briefing() only.
create policy "team reads own briefing" on public.team_briefing for select using (team_id = public.current_team_id());
create policy "admins read briefing" on public.team_briefing for select using (public.is_admin());

create or replace function public.get_briefing_status() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('completed', b.team_id is not null, 'completedAt', b.completed_at)
  from (select 1) x left join public.team_briefing b on b.team_id = public.current_team_id()
$$;

create or replace function public.complete_briefing() returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public.current_team_id(); at timestamptz;
begin
  if t is null then raise exception 'forbidden'; end if;
  insert into public.team_briefing (team_id) values (t) on conflict (team_id) do nothing;
  select completed_at into at from public.team_briefing where team_id = t;
  return jsonb_build_object('completed', true, 'completedAt', at);
end $$;
grant execute on function public.get_briefing_status(), public.complete_briefing() to authenticated;
