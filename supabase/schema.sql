-- ============================================================================================
-- RAS: Mission Impossible — database schema (Supabase / Postgres).
-- Run this WHOLE file once in the Supabase SQL editor. It is safe to run again (re-running keeps your data).
--
-- SECURITY MODEL (read this):
--   * Browsers talk to the database ONLY through the functions at the bottom of this file. No table is readable or
--     writable directly: every table has Row Level Security on, no policies, and no grants for anon/authenticated.
--   * Accepted answers are stored only as salted SHA-256 hashes in `question_secrets`. They are never sent to a browser,
--     not even to organisers. A team learns only "correct" / "incorrect".
--   * Locked questions, hints and locations are not returned until the server says the team has earned them.
--   * Roles live in `profiles` and can only be changed here, in the SQL editor. The browser can never set a role.
-- ============================================================================================

create extension if not exists pgcrypto with schema extensions;

-- New objects must never be reachable from the browser by default.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- ===================================== TABLES =====================================

create sequence if not exists public.team_seq;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('RAS-' || lpad(nextval('public.team_seq')::text, 3, '0')), -- shown as the team ID
  name text not null check (char_length(btrim(name)) between 2 and 40),
  college text not null default '',
  join_code text not null unique check (join_code ~ '^[0-9]{6}$'),                                 -- 6 digits, shared with teammates
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists teams_name_unique on public.teams (lower(btrim(name)));

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'team' check (role in ('team', 'admin')),
  display_name text not null default '',
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists profiles_team_idx on public.profiles (team_id);

create table if not exists public.join_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists join_attempts_user_idx on public.join_attempts (user_id, at desc);

-- Gameplay window (server-enforced). One row.
create table if not exists public.gameplay_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  override_mode text check (override_mode in ('open', 'closed', 'extend')),
  override_until timestamptz,
  confirmed boolean not null default false
);
-- PROVISIONAL window = the event time (24 Oct 2026, 8:30-11:30 IST). Starts with override 'open' so you can test now.
-- Before the event: Admin app > Settings > set the override to "Follow the schedule".
insert into public.gameplay_settings (starts_at, ends_at, override_mode, confirmed)
values ('2026-10-24T08:30:00+05:30', '2026-10-24T11:30:00+05:30', 'open', false)
on conflict (id) do nothing;

create table if not exists public.mission_settings (
  id boolean primary key default true check (id),
  progression_mode text not null default 'answer' check (progression_mode in ('answer', 'recovery', 'answer_and_approval')),
  hint_reveal text not null default 'on_correct_answer' check (hint_reveal in ('on_correct_answer', 'organiser_release'))
);
insert into public.mission_settings default values on conflict (id) do nothing;

-- The four questions. Content is entered in the admin app; nothing here is event content.
create table if not exists public.questions (
  idx int primary key check (idx between 1 and 4),
  active boolean not null default false,
  title text not null default '',
  body text not null default '',
  type text not null default 'text' check (type in ('text', 'choice')),
  options jsonb not null default '[]',
  case_sensitive boolean not null default false,
  attempts_allowed int check (attempts_allowed is null or attempts_allowed > 0)  -- null = unlimited
);
-- Accepted answers, HASHED. `answer_hashes` = hashes of the lower-cased form, `answer_hashes_cs` = case-preserved form.
create table if not exists public.question_secrets (
  idx int primary key references public.questions(idx) on delete cascade,
  salt text not null default gen_random_uuid()::text,
  answer_hashes text[] not null default '{}',
  answer_hashes_cs text[] not null default '{}'
);
create table if not exists public.question_hints (
  idx int primary key references public.questions(idx) on delete cascade,
  hint_text text not null default ''
);
create table if not exists public.components (
  idx int primary key references public.questions(idx) on delete cascade,
  component_code text not null default '',
  location_note text not null default '',                 -- organisers only, never sent to teams
  method text not null default 'qr' check (method in ('qr', 'organiser_confirms')),
  required_for_progression boolean not null default true,
  token_hash text,                                        -- sha256 of the random QR token; the raw token is never stored
  active boolean not null default true
);
insert into public.questions (idx) select g from generate_series(1, 4) g on conflict do nothing;
insert into public.question_secrets (idx) select g from generate_series(1, 4) g on conflict do nothing;
insert into public.question_hints (idx) select g from generate_series(1, 4) g on conflict do nothing;
insert into public.components (idx) select g from generate_series(1, 4) g on conflict do nothing;

create table if not exists public.team_progress (
  team_id uuid not null references public.teams(id) on delete cascade,
  idx int not null references public.questions(idx) on delete cascade,
  solved_at timestamptz,
  solved_by uuid references auth.users(id) on delete set null,
  hint_released boolean not null default false,
  primary key (team_id, idx)
);
create table if not exists public.team_attempts (
  id bigserial primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  idx int not null references public.questions(idx) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  answer text not null,
  result text not null check (result in ('correct', 'incorrect')),
  submitted_at timestamptz not null default now()
);
create index if not exists team_attempts_team_idx on public.team_attempts (team_id, idx, submitted_at desc);
create index if not exists team_attempts_time_idx on public.team_attempts (submitted_at desc);
create table if not exists public.component_recoveries (
  team_id uuid not null references public.teams(id) on delete cascade,
  idx int not null references public.questions(idx) on delete cascade,
  via text not null check (via in ('qr', 'organiser')),
  recovered_at timestamptz not null default now(),
  recovered_by uuid references auth.users(id) on delete set null,
  primary key (team_id, idx)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  kind text not null default 'info' check (kind in ('info', 'schedule', 'safety')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Official rounds (names and maxima are fixed: 100 + 150 + 200 + 150 + 300 = 900).
create table if not exists public.round_scores (
  team_id uuid not null references public.teams(id) on delete cascade,
  round int not null check (round between 1 and 5),
  points numeric not null check (points >= 0),
  primary key (team_id, round)
);
create table if not exists public.qualification_settings (
  id boolean primary key default true check (id),
  criteria text not null default '',
  slots int check (slots is null or slots > 0),
  cutoff numeric check (cutoff is null or cutoff >= 0),
  tie_breaker text check (tie_breaker in ('final_score', 'total_time', 'short_puzzle')),
  published boolean not null default false
);
insert into public.qualification_settings default values on conflict (id) do nothing;
create table if not exists public.qualification_decisions (
  team_id uuid primary key references public.teams(id) on delete cascade,
  decision text not null check (decision in ('qualified', 'not_qualified'))
);

create table if not exists public.user_briefing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_label text,
  action text not null,
  detail text
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

-- RLS on, NO policies: only the SECURITY DEFINER functions below can touch these tables.
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.join_attempts enable row level security;
alter table public.gameplay_settings enable row level security;
alter table public.mission_settings enable row level security;
alter table public.questions enable row level security;
alter table public.question_secrets enable row level security;
alter table public.question_hints enable row level security;
alter table public.components enable row level security;
alter table public.team_progress enable row level security;
alter table public.team_attempts enable row level security;
alter table public.component_recoveries enable row level security;
alter table public.announcements enable row level security;
alter table public.round_scores enable row level security;
alter table public.qualification_settings enable row level security;
alter table public.qualification_decisions enable row level security;
alter table public.user_briefing enable row level security;
alter table public.audit_log enable row level security;

-- ===================================== SIGN-UP TRIGGER =====================================
-- Every new auth user gets a 'team' (player) profile. The role is NEVER read from user-supplied metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'team', left(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), 60))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Users that existed before this script ran:
insert into public.profiles (id) select u.id from auth.users u on conflict (id) do nothing;

-- ===================================== INTERNAL HELPERS (not callable from browsers) =====================================

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.current_team_id() returns uuid
language sql security definer set search_path = public stable as
$$ select team_id from public.profiles where id = auth.uid() and role = 'team' $$;

create or replace function public._need_team() returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid := public.current_team_id();
begin
  if t is null then raise exception 'no_team' using errcode = 'P0001'; end if;
  return t;
end $$;

create or replace function public._need_admin() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
end $$;

create or replace function public._team_max() returns int language sql immutable as $$ select 4 $$;

create or replace function public._audit(p_action text, p_detail text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor, actor_label, action, detail)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), p_action, p_detail);
end $$;

create or replace function public._norm_answer(p text, p_cs boolean) returns text
language sql immutable as $$
  select case when p_cs then regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')
              else lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')) end $$;

create or replace function public._answer_hash(p_salt text, p_norm text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(p_salt || '|' || p_norm, 'sha256'), 'hex') $$;

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

create or replace function public._assert_open() returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.gameplay_state() <> 'open' then raise exception 'gameplay_closed' using errcode = 'P0001'; end if;
end $$;

-- Has question p_idx been "cleared" so p_idx+1 may unlock? Depends on the organiser-chosen progression mode.
create or replace function public._question_cleared(p_team uuid, p_idx int) returns boolean
language plpgsql security definer set search_path = public as $$
declare m text; solved boolean; rec text; req boolean;
begin
  select progression_mode into m from public.mission_settings;
  select exists (select 1 from public.team_progress where team_id = p_team and idx = p_idx and solved_at is not null) into solved;
  select via into rec from public.component_recoveries where team_id = p_team and idx = p_idx;
  select coalesce(required_for_progression, true) into req from public.components where idx = p_idx;
  req := coalesce(req, true);
  -- Never return NULL: callers use `not _question_cleared(...)`, and `not NULL` would read as "unlocked".
  if m = 'answer' then return coalesce(solved, false);
  elsif m = 'recovery' then return coalesce(case when req then rec is not null else solved end, false);
  else return coalesce(solved and (not req or rec = 'organiser'), false); end if;
end $$;

create or replace function public._question_unlocked(p_team uuid, p_idx int) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select active from public.questions where idx = p_idx), false) then return false; end if;
  if p_idx = 1 then return true; end if;
  return coalesce(public._question_unlocked(p_team, p_idx - 1) and public._question_cleared(p_team, p_idx - 1), false);
end $$;

create or replace function public._team_json(p_team uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('id', t.id, 'name', t.name, 'code', t.code, 'college', t.college, 'joinCode', t.join_code,
    'maxMembers', public._team_max(),
    'members', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(nullif(p.display_name, ''), 'Member'), 'isYou', p.id = auth.uid()) order by p.created_at)
                         from public.profiles p where p.team_id = t.id), '[]'::jsonb))
  from public.teams t where t.id = p_team $$;

-- ===================================== PUBLIC =====================================

-- Landing page: when does gameplay open? Includes the server clock so devices with wrong clocks still agree.
create or replace function public.get_gameplay_status() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('enabled', enabled, 'starts_at', starts_at, 'ends_at', ends_at,
    'override_mode', override_mode, 'override_until', override_until, 'confirmed', confirmed,
    'state', public.gameplay_state(), 'server_now', now())
  from public.gameplay_settings
$$;

-- ===================================== ACCOUNT + TEAM (signed-in players) =====================================

create or replace function public.get_my_profile() returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.profiles; em text;
begin
  if auth.uid() is null then return null; end if;
  select * into p from public.profiles where id = auth.uid();
  if not found then return null; end if;
  select email into em from auth.users where id = auth.uid();
  return jsonb_build_object('id', p.id, 'email', em, 'role', p.role, 'displayName', p.display_name,
    'team', case when p.team_id is null then null else public._team_json(p.team_id) end);
end $$;

create or replace function public.set_display_name(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  update public.profiles set display_name = left(btrim(coalesce(p_name, '')), 60) where id = auth.uid();
end $$;

create or replace function public.create_team(p_name text, p_college text, p_display_name text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid := auth.uid(); p public.profiles; v_name text := btrim(coalesce(p_name, '')); v_dn text := btrim(coalesce(p_display_name, ''));
        v_code text; v_team uuid; n int := 0;
begin
  if u is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  select * into p from public.profiles where id = u for update;
  if not found or p.role <> 'team' then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if p.team_id is not null then return jsonb_build_object('ok', false, 'reason', 'already_in_team'); end if;
  if char_length(v_name) not between 2 and 40 then return jsonb_build_object('ok', false, 'reason', 'invalid_name'); end if;
  loop
    v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    begin
      insert into public.teams (name, college, join_code, created_by)
      values (v_name, left(btrim(coalesce(p_college, '')), 80), v_code, u) returning id into v_team;
      exit;
    exception when unique_violation then
      if exists (select 1 from public.teams where lower(btrim(name)) = lower(v_name)) then
        return jsonb_build_object('ok', false, 'reason', 'name_taken');
      end if;
      n := n + 1;
      if n > 25 then raise exception 'could_not_generate_code'; end if;
    end;
  end loop;
  update public.profiles set team_id = v_team, display_name = case when v_dn <> '' then left(v_dn, 60) else display_name end where id = u;
  perform public._audit('team_created', v_name);
  return jsonb_build_object('ok', true, 'team', public._team_json(v_team));
end $$;

-- "Log in" for teammates: only the team's 6-digit code and your name. The browser first gets an anonymous Supabase session
-- (Authentication > Providers > "Allow anonymous sign-ins"), then calls this to attach that session to the team.
-- If someone with the same name is already in the team, this person is that member coming back (new phone, cleared browser):
-- the older session is detached and this one takes its place, so the member count never grows.
create or replace function public.login_with_code(p_code text, p_display_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); p public.profiles; t public.teams; v_code text := btrim(coalesce(p_code, '')); v_dn text := btrim(coalesce(p_display_name, '')); fails int; old uuid;
begin
  if u is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  select * into p from public.profiles where id = u for update;
  if not found or p.role <> 'team' then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if p.team_id is not null then return jsonb_build_object('ok', false, 'reason', 'already_in_team'); end if;
  if char_length(v_dn) not between 1 and 40 then return jsonb_build_object('ok', false, 'reason', 'invalid_name'); end if;
  -- Throttle guessing: 8 wrong codes per 10 minutes per session, and a global ceiling while under attack.
  select count(*) into fails from public.join_attempts where user_id = u and not ok and at > now() - interval '10 minutes';
  if fails >= 8 then return jsonb_build_object('ok', false, 'reason', 'too_many'); end if;
  select count(*) into fails from public.join_attempts where not ok and at > now() - interval '10 minutes';
  if fails >= 300 then return jsonb_build_object('ok', false, 'reason', 'too_many'); end if;
  select * into t from public.teams where join_code = v_code for update;
  if not found then
    insert into public.join_attempts (user_id, ok) values (u, false);
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  select id into old from public.profiles where team_id = t.id and id <> u and lower(btrim(display_name)) = lower(v_dn) limit 1;
  if old is not null then
    update public.profiles set team_id = null where id = old;
    perform public._audit('team_login_takeover', t.name || ': ' || v_dn);
  elsif (select count(*) from public.profiles where team_id = t.id) >= public._team_max() then
    return jsonb_build_object('ok', false, 'reason', 'team_full');
  end if;
  update public.profiles set team_id = t.id, display_name = left(v_dn, 60) where id = u;
  insert into public.join_attempts (user_id, ok) values (u, true);
  perform public._audit('team_login', t.name || ': ' || v_dn);
  return jsonb_build_object('ok', true, 'team', public._team_json(t.id));
end $$;

-- Leave your team. If you were the last member, the (empty) team and its progress are deleted.
create or replace function public.leave_team() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); v_team uuid;
begin
  if u is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  select team_id into v_team from public.profiles where id = u and role = 'team' for update;
  if v_team is null then return jsonb_build_object('ok', false, 'reason', 'no_team'); end if;
  update public.profiles set team_id = null where id = u;
  perform public._audit('team_left', v_team::text);
  if not exists (select 1 from public.profiles where team_id = v_team) then delete from public.teams where id = v_team; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ===================================== MISSION (team members) =====================================

-- Team view. Locked questions return ONLY {index, status:'locked'}. Hints/locations/answers are never sent early.
create or replace function public.get_mission_state() returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public._need_team(); s public.mission_settings; items jsonb := '[]'; i int; q public.questions;
  solved boolean; hint_on boolean; rec text; cur int; n_solved int := 0; all_cleared boolean := true; c public.components;
begin
  perform public._assert_open();
  select * into s from public.mission_settings;
  for i in 1..4 loop
    select * into q from public.questions where idx = i;
    if not found or not public._question_unlocked(t, i) then
      items := items || jsonb_build_object('index', i, 'status', 'locked'); all_cleared := false; continue;
    end if;
    select exists (select 1 from public.team_progress where team_id = t and idx = i and solved_at is not null) into solved;
    select * into c from public.components where idx = i;
    select via into rec from public.component_recoveries where team_id = t and idx = i;
    hint_on := case when s.hint_reveal = 'on_correct_answer' then solved
                    else coalesce((select hint_released from public.team_progress where team_id = t and idx = i), false) end;
    if solved then n_solved := n_solved + 1; elsif cur is null then cur := i; end if;
    if not public._question_cleared(t, i) then all_cleared := false; end if;
    items := items || jsonb_build_object(
      'index', i, 'status', case when solved then 'solved' else 'available' end,
      'title', q.title, 'body', q.body, 'type', q.type,
      'options', case when q.type = 'choice' then q.options else '[]'::jsonb end,
      'attemptsUsed', (select count(*) from public.team_attempts where team_id = t and idx = i),
      'attemptsAllowed', q.attempts_allowed,
      'hint', case when hint_on then jsonb_build_object('status', 'unlocked', 'text', (select hint_text from public.question_hints where idx = i))
                   else jsonb_build_object('status', 'hidden') end,
      'component', jsonb_build_object('id', c.component_code, 'method', c.method, 'requiredForProgression', c.required_for_progression,
                                      'status', case when rec is null then 'not_recovered' else 'recovered' end, 'via', rec),
      'nextUnlocked', i < 4 and public._question_unlocked(t, i + 1));
  end loop;
  return jsonb_build_object('settings', jsonb_build_object('progressionMode', s.progression_mode, 'hintReveal', s.hint_reveal),
    'questions', items, 'currentIndex', cur, 'solvedCount', n_solved, 'complete', n_solved = 4 and all_cleared);
end $$;

-- Atomic and idempotent. The answer is compared against HASHES; the plaintext never exists in the database.
create or replace function public.submit_answer(p_question int, p_answer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public._need_team(); q public.questions; sec public.question_secrets; ok boolean; used int; last_at timestamptz; v_ans text := coalesce(p_answer, '');
begin
  perform public._assert_open();
  if p_question is null or p_question not between 1 and 4 then return jsonb_build_object('result', 'locked'); end if;
  if char_length(btrim(v_ans)) = 0 or char_length(v_ans) > 500 then return jsonb_build_object('result', 'incorrect'); end if;
  perform pg_advisory_xact_lock(hashtextextended(t::text || ':' || p_question, 0));
  select * into q from public.questions where idx = p_question;
  if not found or not public._question_unlocked(t, p_question) then return jsonb_build_object('result', 'locked'); end if;
  if exists (select 1 from public.team_progress where team_id = t and idx = p_question and solved_at is not null) then
    return jsonb_build_object('result', 'already_solved'); end if;
  select count(*), max(submitted_at) into used, last_at from public.team_attempts where team_id = t and idx = p_question;
  if q.attempts_allowed is not null and used >= q.attempts_allowed then return jsonb_build_object('result', 'attempts_exhausted'); end if;
  if last_at is not null and last_at > now() - interval '2 seconds' then return jsonb_build_object('result', 'too_fast'); end if;
  select * into sec from public.question_secrets where idx = p_question;
  ok := found and case when q.case_sensitive
         then public._answer_hash(sec.salt, public._norm_answer(v_ans, true)) = any (sec.answer_hashes_cs)
         else public._answer_hash(sec.salt, public._norm_answer(v_ans, false)) = any (sec.answer_hashes) end;
  ok := coalesce(ok, false);
  insert into public.team_attempts (team_id, idx, user_id, answer, result) values (t, p_question, auth.uid(), v_ans, case when ok then 'correct' else 'incorrect' end);
  if ok then
    insert into public.team_progress (team_id, idx, solved_at, solved_by) values (t, p_question, now(), auth.uid())
    on conflict (team_id, idx) do update set solved_at = coalesce(public.team_progress.solved_at, now()), solved_by = coalesce(public.team_progress.solved_by, auth.uid());
  end if;
  return jsonb_build_object('result', case when ok then 'correct' else 'incorrect' end,
    'state', case when ok then public.get_mission_state() end);
end $$;

create or replace function public.list_my_submissions() returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public._need_team();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('questionIndex', a.idx, 'submittedAt', a.submitted_at, 'answer', a.answer, 'result', a.result,
                     'by', coalesce(nullif(p.display_name, ''), 'Member')) order by a.submitted_at desc)
                   from public.team_attempts a left join public.profiles p on p.id = a.user_id where a.team_id = t), '[]'::jsonb);
end $$;

create or replace function public.verify_checkpoint(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare t uuid := public._need_team(); c public.components; h text; v_tok text := btrim(coalesce(p_token, ''));
begin
  perform public._assert_open();
  if char_length(v_tok) = 0 or char_length(v_tok) > 200 then return jsonb_build_object('result', 'invalid'); end if;
  h := encode(digest(v_tok, 'sha256'), 'hex');
  select * into c from public.components where token_hash = h and method = 'qr' and active;
  if not found then return jsonb_build_object('result', 'invalid'); end if;
  if not public._question_unlocked(t, c.idx) then return jsonb_build_object('result', 'wrong_stage'); end if;
  insert into public.component_recoveries (team_id, idx, via, recovered_by) values (t, c.idx, 'qr', auth.uid()) on conflict do nothing;
  if not found then return jsonb_build_object('result', 'already_processed'); end if;
  return jsonb_build_object('result', 'valid', 'questionIndex', c.idx, 'state', public.get_mission_state());
end $$;

create or replace function public.list_announcements() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_team();
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'kind', a.kind, 'at', a.created_at) order by a.created_at desc)
                   from public.announcements a), '[]'::jsonb);
end $$;

create or replace function public.get_my_progress() returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public._need_team(); q public.qualification_settings;
begin
  select * into q from public.qualification_settings;
  return jsonb_build_object('published', q.published,
    'scores', case when q.published then coalesce((select jsonb_object_agg(round::text, points) from public.round_scores where team_id = t), '{}'::jsonb) end,
    'decision', case when q.published then (select decision from public.qualification_decisions where team_id = t) end,
    'criteriaConfigured', (q.criteria <> '' or q.slots is not null or q.cutoff is not null));
end $$;

-- Mission briefing completion (per player). Presentation state only: never starts a timer or unlocks anything.
create or replace function public.get_briefing_status() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('completed', b.user_id is not null, 'completedAt', b.completed_at)
  from (select 1) x left join public.user_briefing b on b.user_id = auth.uid()
$$;
create or replace function public.complete_briefing() returns jsonb
language plpgsql security definer set search_path = public as $$
declare at timestamptz;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  insert into public.user_briefing (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select completed_at into at from public.user_briefing where user_id = auth.uid();
  return jsonb_build_object('completed', true, 'completedAt', at);
end $$;

-- ===================================== ADMIN (each function re-checks is_admin()) =====================================

create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  return jsonb_build_object(
    'players', (select count(*) from public.profiles where role = 'team'),
    'playersWithoutTeam', (select count(*) from public.profiles where role = 'team' and team_id is null),
    'teams', (select count(*) from public.teams),
    'attemptsLastHour', (select count(*) from public.team_attempts where submitted_at > now() - interval '1 hour'),
    'state', public.gameplay_state(), 'serverNow', now());
end $$;

create or replace function public.admin_list_teams() returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  perform public._need_admin();
  select coalesce(jsonb_agg(x order by x ->> 'code'), '[]'::jsonb) into out from (
    select jsonb_build_object(
      'id', t.id, 'code', t.code, 'name', t.name, 'college', t.college, 'joinCode', t.join_code, 'createdAt', t.created_at,
      'members', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name, 'email', u.email) order by p.created_at)
                           from public.profiles p join auth.users u on u.id = p.id where p.team_id = t.id), '[]'::jsonb),
      'solvedCount', (select count(*) from public.team_progress where team_id = t.id and solved_at is not null),
      'attempts', (select count(*) from public.team_attempts where team_id = t.id),
      'lastActivity', (select max(submitted_at) from public.team_attempts where team_id = t.id),
      'currentIndex', (select min(g) from generate_series(1, 4) g
                       where public._question_unlocked(t.id, g)
                         and not exists (select 1 from public.team_progress where team_id = t.id and idx = g and solved_at is not null)),
      'complete', (select bool_and(public._question_cleared(t.id, g) and exists (select 1 from public.team_progress where team_id = t.id and idx = g and solved_at is not null))
                   from generate_series(1, 4) g),
      'questions', (select jsonb_agg(jsonb_build_object(
          'index', g, 'unlocked', public._question_unlocked(t.id, g),
          'solved', exists (select 1 from public.team_progress where team_id = t.id and idx = g and solved_at is not null),
          'attempts', (select count(*) from public.team_attempts where team_id = t.id and idx = g),
          'recovered', exists (select 1 from public.component_recoveries where team_id = t.id and idx = g),
          'via', (select via from public.component_recoveries where team_id = t.id and idx = g),
          'hintReleased', coalesce((select hint_released from public.team_progress where team_id = t.id and idx = g), false)) order by g)
        from generate_series(1, 4) g)
    ) as x from public.teams t) s;
  return out;
end $$;

create or replace function public.admin_approve_recovery(p_team uuid, p_index int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  if not exists (select 1 from public.teams where id = p_team) then raise exception 'not_found' using errcode = 'P0001'; end if;
  insert into public.component_recoveries (team_id, idx, via, recovered_by) values (p_team, p_index, 'organiser', auth.uid())
  on conflict (team_id, idx) do update set via = 'organiser', recovered_by = auth.uid(), recovered_at = now();
  perform public._audit('recovery_approved', (select code from public.teams where id = p_team) || ' Q' || p_index);
end $$;

create or replace function public.admin_release_hint(p_team uuid, p_index int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  if not exists (select 1 from public.teams where id = p_team) then raise exception 'not_found' using errcode = 'P0001'; end if;
  insert into public.team_progress (team_id, idx, hint_released) values (p_team, p_index, true)
  on conflict (team_id, idx) do update set hint_released = true;
  perform public._audit('hint_released', (select code from public.teams where id = p_team) || ' Q' || p_index);
end $$;

create or replace function public.admin_reset_team(p_team uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  delete from public.team_progress where team_id = p_team;
  delete from public.team_attempts where team_id = p_team;
  delete from public.component_recoveries where team_id = p_team;
  perform public._audit('team_progress_reset', coalesce((select code from public.teams where id = p_team), p_team::text));
end $$;

create or replace function public.admin_remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  update public.profiles set team_id = null where id = p_user and role = 'team';
  perform public._audit('member_removed', coalesce((select email from auth.users where id = p_user), p_user::text));
end $$;

create or replace function public.admin_delete_team(p_team uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  perform public._need_admin();
  select code into v_code from public.teams where id = p_team;
  delete from public.teams where id = p_team;
  perform public._audit('team_deleted', coalesce(v_code, p_team::text));
end $$;

create or replace function public.admin_get_settings() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.mission_settings;
begin
  perform public._need_admin();
  select * into s from public.mission_settings;
  return jsonb_build_object('progressionMode', s.progression_mode, 'hintReveal', s.hint_reveal);
end $$;

create or replace function public.admin_save_settings(p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  update public.mission_settings set
    progression_mode = coalesce(p_settings ->> 'progressionMode', progression_mode),
    hint_reveal = coalesce(p_settings ->> 'hintReveal', hint_reveal);
  perform public._audit('settings_changed', p_settings::text);
  return public.admin_get_settings();
end $$;

create or replace function public.admin_get_gameplay() returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.gameplay_settings;
begin
  perform public._need_admin();
  select * into g from public.gameplay_settings;
  return jsonb_build_object('enabled', g.enabled, 'startsAt', g.starts_at, 'endsAt', g.ends_at, 'overrideMode', g.override_mode,
    'overrideUntil', g.override_until, 'confirmed', g.confirmed, 'state', public.gameplay_state(), 'serverNow', now());
end $$;

create or replace function public.admin_save_gameplay(p_g jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  update public.gameplay_settings set
    enabled = coalesce((p_g ->> 'enabled')::boolean, enabled),
    starts_at = case when p_g ? 'startsAt' then nullif(p_g ->> 'startsAt', '')::timestamptz else starts_at end,
    ends_at = case when p_g ? 'endsAt' then nullif(p_g ->> 'endsAt', '')::timestamptz else ends_at end,
    override_mode = case when p_g ? 'overrideMode' then nullif(p_g ->> 'overrideMode', '') else override_mode end,
    override_until = case when p_g ? 'overrideUntil' then nullif(p_g ->> 'overrideUntil', '')::timestamptz else override_until end,
    confirmed = coalesce((p_g ->> 'confirmed')::boolean, confirmed);
  perform public._audit('gameplay_window_changed', p_g::text);
  return public.admin_get_gameplay();
end $$;

-- Questions as organisers see them. Accepted answers are NOT returned (they are only hashes); only how many are set.
create or replace function public.admin_list_questions() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  return (select jsonb_agg(jsonb_build_object(
      'index', q.idx, 'active', q.active, 'title', q.title, 'body', q.body, 'type', q.type, 'options', q.options,
      'caseSensitive', q.case_sensitive, 'attemptsAllowed', q.attempts_allowed,
      'answerCount', coalesce(array_length(s.answer_hashes, 1), 0),
      'hintText', h.hint_text,
      'component', jsonb_build_object('code', c.component_code, 'locationNote', c.location_note, 'method', c.method,
                                      'requiredForProgression', c.required_for_progression, 'active', c.active, 'tokenSet', c.token_hash is not null)
    ) order by q.idx)
    from public.questions q
    join public.question_secrets s on s.idx = q.idx join public.question_hints h on h.idx = q.idx join public.components c on c.idx = q.idx);
end $$;

-- p_q keys (all optional): active, title, body, type, options[], caseSensitive, attemptsAllowed, hintText,
--   acceptedAnswers[] (REPLACES the stored answers when non-empty), component{code, locationNote, method, requiredForProgression, active}
create or replace function public.admin_save_question(p_index int, p_q jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare q public.questions; v_type text; v_opts jsonb; v_cs boolean; v_active boolean; v_salt text; a text; hs text[] := '{}'; hcs text[] := '{}';
        n_answers int; comp jsonb := coalesce(p_q -> 'component', '{}'::jsonb);
begin
  perform public._need_admin();
  select * into q from public.questions where idx = p_index;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  v_type := coalesce(p_q ->> 'type', q.type);
  if v_type not in ('text', 'choice') then raise exception 'invalid' using errcode = 'P0001'; end if;
  v_opts := coalesce(p_q -> 'options', q.options);
  if jsonb_typeof(v_opts) <> 'array' then raise exception 'invalid' using errcode = 'P0001'; end if;
  if v_type = 'choice' and jsonb_array_length(v_opts) < 2 then raise exception 'options_required' using errcode = 'P0001'; end if;
  v_cs := coalesce((p_q ->> 'caseSensitive')::boolean, q.case_sensitive);
  v_active := coalesce((p_q ->> 'active')::boolean, q.active);

  if jsonb_typeof(p_q -> 'acceptedAnswers') = 'array' and jsonb_array_length(p_q -> 'acceptedAnswers') > 0 then
    v_salt := gen_random_uuid()::text;
    for a in select jsonb_array_elements_text(p_q -> 'acceptedAnswers') loop
      if btrim(a) <> '' then
        hs := hs || public._answer_hash(v_salt, public._norm_answer(a, false));
        hcs := hcs || public._answer_hash(v_salt, public._norm_answer(a, true));
      end if;
    end loop;
    if array_length(hs, 1) is null then raise exception 'invalid' using errcode = 'P0001'; end if;
    update public.question_secrets set salt = v_salt, answer_hashes = hs, answer_hashes_cs = hcs where idx = p_index;
  end if;

  select coalesce(array_length(answer_hashes, 1), 0) into n_answers from public.question_secrets where idx = p_index;
  if v_active and n_answers = 0 then raise exception 'answers_required' using errcode = 'P0001'; end if;

  update public.questions set
    active = v_active, type = v_type, options = v_opts, case_sensitive = v_cs,
    title = left(coalesce(p_q ->> 'title', title), 200), body = left(coalesce(p_q ->> 'body', body), 5000),
    attempts_allowed = case when p_q ? 'attemptsAllowed' then nullif(p_q ->> 'attemptsAllowed', '')::int else attempts_allowed end
  where idx = p_index;
  if p_q ? 'hintText' then update public.question_hints set hint_text = left(coalesce(p_q ->> 'hintText', ''), 2000) where idx = p_index; end if;
  update public.components set
    component_code = left(coalesce(comp ->> 'code', component_code), 60),
    location_note = left(coalesce(comp ->> 'locationNote', location_note), 500),
    method = coalesce(comp ->> 'method', method),
    required_for_progression = coalesce((comp ->> 'requiredForProgression')::boolean, required_for_progression),
    active = coalesce((comp ->> 'active')::boolean, active)
  where idx = p_index;
  perform public._audit('question_saved', 'Q' || p_index || case when jsonb_typeof(p_q -> 'acceptedAnswers') = 'array' and jsonb_array_length(p_q -> 'acceptedAnswers') > 0 then ' (answers replaced)' else '' end);
end $$;

-- Lets an organiser check an answer WITHOUT ever revealing the stored ones.
create or replace function public.admin_check_answer(p_index int, p_answer text) returns boolean
language plpgsql security definer set search_path = public as $$
declare q public.questions; sec public.question_secrets;
begin
  perform public._need_admin();
  select * into q from public.questions where idx = p_index;
  select * into sec from public.question_secrets where idx = p_index;
  if q is null or sec is null then return false; end if;
  return case when q.case_sensitive
           then public._answer_hash(sec.salt, public._norm_answer(p_answer, true)) = any (sec.answer_hashes_cs)
           else public._answer_hash(sec.salt, public._norm_answer(p_answer, false)) = any (sec.answer_hashes) end;
end $$;

-- Creates a NEW random QR token for question p_index and returns it ONCE. Only its hash is stored; the old token stops working.
create or replace function public.admin_generate_token(p_index int) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare tok text := 'RAS' || encode(gen_random_bytes(16), 'hex');
begin
  perform public._need_admin();
  update public.components set token_hash = encode(digest(tok, 'sha256'), 'hex') where idx = p_index;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform public._audit('checkpoint_token_generated', 'Q' || p_index);
  return tok;
end $$;

create or replace function public.admin_revoke_token(p_index int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  update public.components set token_hash = null where idx = p_index;
  perform public._audit('checkpoint_token_revoked', 'Q' || p_index);
end $$;

create or replace function public.admin_list_attempts(p_limit int default 100, p_team uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  return coalesce((select jsonb_agg(r order by r ->> 'at' desc) from (
    select jsonb_build_object('id', a.id, 'at', a.submitted_at, 'teamId', a.team_id, 'teamCode', t.code, 'teamName', t.name, 'questionIndex', a.idx,
             'answer', a.answer, 'result', a.result, 'by', coalesce(nullif(p.display_name, ''), u.email)) as r
    from public.team_attempts a
    join public.teams t on t.id = a.team_id
    left join public.profiles p on p.id = a.user_id left join auth.users u on u.id = a.user_id
    where p_team is null or a.team_id = p_team
    order by a.submitted_at desc limit greatest(1, least(coalesce(p_limit, 100), 1000))) s), '[]'::jsonb);
end $$;

create or replace function public.admin_audit(p_limit int default 300) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('at', l.at, 'actor', l.actor_label, 'action', l.action, 'detail', l.detail) order by l.at desc)
                   from (select * from public.audit_log order by at desc limit greatest(1, least(coalesce(p_limit, 300), 2000))) l), '[]'::jsonb);
end $$;

create or replace function public.admin_list_announcements() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'kind', a.kind, 'at', a.created_at) order by a.created_at desc)
                   from public.announcements a), '[]'::jsonb);
end $$;

create or replace function public.admin_save_announcement(p_a jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_title text := btrim(coalesce(p_a ->> 'title', '')); v_body text := btrim(coalesce(p_a ->> 'body', '')); v_kind text := coalesce(nullif(p_a ->> 'kind', ''), 'info');
begin
  perform public._need_admin();
  if v_title = '' or v_body = '' or v_kind not in ('info', 'schedule', 'safety') then raise exception 'invalid' using errcode = 'P0001'; end if;
  insert into public.announcements (title, body, kind, created_by) values (left(v_title, 120), left(v_body, 1000), v_kind, auth.uid());
  perform public._audit('announcement_published', left(v_title, 120));
end $$;

create or replace function public.admin_retract_announcement(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  perform public._need_admin();
  delete from public.announcements where id = p_id returning title into v_title;
  perform public._audit('announcement_retracted', coalesce(v_title, p_id::text));
end $$;

create or replace function public._round_max(p int) returns int language sql immutable as
$$ select case p when 1 then 100 when 2 then 150 when 3 then 200 when 4 then 150 when 5 then 300 end $$;

create or replace function public.admin_get_results() returns jsonb
language plpgsql security definer set search_path = public as $$
declare q public.qualification_settings;
begin
  perform public._need_admin();
  select * into q from public.qualification_settings;
  return jsonb_build_object(
    'qualification', jsonb_build_object('criteria', q.criteria, 'slots', q.slots, 'cutoff', q.cutoff, 'tieBreaker', q.tie_breaker, 'published', q.published),
    'teams', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'code', t.code, 'name', t.name,
        'scores', coalesce((select jsonb_object_agg(s.round::text, s.points) from public.round_scores s where s.team_id = t.id), '{}'::jsonb),
        'decision', coalesce((select decision from public.qualification_decisions d where d.team_id = t.id), 'pending')) order by t.code)
      from public.teams t), '[]'::jsonb));
end $$;

create or replace function public.admin_save_score(p_team uuid, p_round int, p_value numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  if p_round is null or p_round not between 1 and 5 then raise exception 'invalid' using errcode = 'P0001'; end if;
  if p_value is null then
    delete from public.round_scores where team_id = p_team and round = p_round;
  else
    if p_value < 0 or p_value > public._round_max(p_round) then raise exception 'out_of_range' using errcode = 'P0001'; end if;
    insert into public.round_scores (team_id, round, points) values (p_team, p_round, p_value)
    on conflict (team_id, round) do update set points = excluded.points;
  end if;
  perform public._audit('score_recorded', coalesce((select code from public.teams where id = p_team), p_team::text) || ' round ' || p_round || ': ' || coalesce(p_value::text, 'cleared'));
end $$;

create or replace function public.admin_save_qualification(p_q jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  update public.qualification_settings set
    criteria = left(coalesce(p_q ->> 'criteria', criteria), 2000),
    slots = case when p_q ? 'slots' then nullif(p_q ->> 'slots', '')::int else slots end,
    cutoff = case when p_q ? 'cutoff' then nullif(p_q ->> 'cutoff', '')::numeric else cutoff end,
    tie_breaker = case when p_q ? 'tieBreaker' then nullif(p_q ->> 'tieBreaker', '') else tie_breaker end;
  perform public._audit('qualification_criteria_saved', p_q::text);
end $$;

create or replace function public.admin_decide_qualification(p_team uuid, p_decision text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  if p_decision = 'pending' then delete from public.qualification_decisions where team_id = p_team;
  elsif p_decision in ('qualified', 'not_qualified') then
    insert into public.qualification_decisions (team_id, decision) values (p_team, p_decision)
    on conflict (team_id) do update set decision = excluded.decision;
  else raise exception 'invalid' using errcode = 'P0001'; end if;
  perform public._audit('qualification_decision', coalesce((select code from public.teams where id = p_team), p_team::text) || ': ' || p_decision);
end $$;

create or replace function public.admin_publish_results(p_published boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._need_admin();
  update public.qualification_settings set published = coalesce(p_published, false);
  perform public._audit(case when p_published then 'results_published' else 'results_unpublished' end, null);
end $$;

-- ===================================== PERMISSIONS (last, so nothing above can leave a door open) =====================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Landing page (not signed in)
grant execute on function public.get_gameplay_status() to anon, authenticated;

-- Signed-in players
grant execute on function
  public.get_my_profile(), public.set_display_name(text), public.create_team(text, text, text), public.login_with_code(text, text), public.leave_team(),
  public.get_mission_state(), public.submit_answer(int, text), public.list_my_submissions(), public.verify_checkpoint(text),
  public.list_announcements(), public.get_my_progress(), public.get_briefing_status(), public.complete_briefing()
to authenticated;

-- Organisers (every function re-checks is_admin() and raises 'forbidden' for anyone else)
grant execute on function
  public.admin_stats(), public.admin_list_teams(), public.admin_approve_recovery(uuid, int), public.admin_release_hint(uuid, int),
  public.admin_reset_team(uuid), public.admin_remove_member(uuid), public.admin_delete_team(uuid),
  public.admin_get_settings(), public.admin_save_settings(jsonb), public.admin_get_gameplay(), public.admin_save_gameplay(jsonb),
  public.admin_list_questions(), public.admin_save_question(int, jsonb), public.admin_check_answer(int, text),
  public.admin_generate_token(int), public.admin_revoke_token(int), public.admin_list_attempts(int, uuid), public.admin_audit(int),
  public.admin_list_announcements(), public.admin_save_announcement(jsonb), public.admin_retract_announcement(uuid),
  public.admin_get_results(), public.admin_save_score(uuid, int, numeric), public.admin_save_qualification(jsonb),
  public.admin_decide_qualification(uuid, text), public.admin_publish_results(boolean)
to authenticated;
