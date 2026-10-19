import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Runs supabase/schema.sql in an in-memory Postgres (PGlite) with a stub of Supabase's auth schema, then attacks it:
// players reading tables, guessing answers, skipping missions, calling organiser functions. Run: npm run test:db
const db = new PGlite({ extensions: { pgcrypto } })
await db.exec(`
  create schema auth; create schema extensions;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema auth, extensions to anon, authenticated;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
`)
const sql = fs.readFileSync(process.argv[2] || fileURLToPath(new URL('../schema.sql', import.meta.url)), 'utf8')
await db.exec(sql)
await db.exec(sql) // re-run must be safe
console.log('schema applied twice OK')

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`) }
const U = {}
for (const n of ['admin', 'p1', 'p2', 'p3', 'p4', 'p5', 'solo']) {
  const r = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [`${n}@x.com`, JSON.stringify({ name: n.toUpperCase(), role: 'admin' })])
  U[n] = r.rows[0].id
}
await db.exec(`update public.profiles set role='admin' where id='${U.admin}'`)
ok('signup metadata cannot set role=admin', (await db.query(`select role from public.profiles where id=$1`, [U.p1])).rows[0].role === 'team')

async function as(who, query, params = [], role = 'authenticated') {
  await db.exec(`reset role; select set_config('test.uid', '${who ? U[who] : ''}', false); set role ${role};`)
  try { const r = await db.query(query, params); await db.exec('reset role'); return { ok: true, rows: r.rows, v: r.rows[0] && Object.values(r.rows[0])[0] } }
  catch (e) { await db.exec('reset role'); return { ok: false, err: e.message } }
}
const rpc = (who, fn, ...args) => as(who, `select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a)))

// ---- nothing is readable or writable directly
for (const t of ['question_secrets', 'profiles', 'teams', 'team_attempts', 'audit_log', 'components', 'questions', 'team_timers', 'team_progress']) {
  const r = await as('p1', `select * from public.${t}`)
  ok(`player cannot SELECT ${t} directly`, !r.ok && /permission denied/.test(r.err), r.err)
}
let w = await as('p1', `update public.profiles set role='admin' where id='${U.p1}'`)
ok('player cannot UPDATE profiles (self-promote)', !w.ok && /permission denied/.test(w.err), w.err)
w = await as('p1', `insert into public.team_progress (team_id, idx, solved_at) values (gen_random_uuid(), 1, now())`)
ok('player cannot INSERT progress', !w.ok)
w = await as(null, `select public.get_my_profile()`, [], 'anon'); ok('anon cannot call get_my_profile', !w.ok && /permission denied/.test(w.err), w.err)
w = await as(null, `select public.get_gameplay_status()`, [], 'anon'); ok('anon can read gameplay status', w.ok && w.v.state === 'open', JSON.stringify(w))
for (const fn of ['_need_admin()', "_answer_hash('a','b')", "set_question(1,'t','b',array['x'])", 'verify_checkpoint', 'admin_stats()']) {
  const r = await as('admin', `select public.${fn.includes('(') ? fn : fn + '(\'x\')'}`)
  ok(`not callable from the API even by an organiser: ${fn}`, !r.ok, JSON.stringify(r))
}
for (const q of ['admin_list_teams()', "admin_set_timer(null, 5)", 'admin_start_timer(null)', 'admin_stop_timer(null)']) {
  const r = await as('p1', `select public.${q}`)
  ok(`player blocked from ${q}`, !r.ok && /forbidden/.test(r.err), r.err)
}

// ---- teams
let r = await rpc('p5', 'get_mission_state'); ok('no-team player cannot read the mission', !r.ok && /no_team/.test(r.err), r.err)
r = await rpc('p1', 'create_team', 'Alpha', 'PES', 'Priya'); ok('create_team ok', r.v.ok === true, JSON.stringify(r.v))
const team = r.v.team; ok('join code is 6 digits', /^\d{6}$/.test(team.joinCode), team.joinCode)
r = await rpc('p1', 'create_team', 'Other', '', ''); ok('cannot create a second team', r.v.reason === 'already_in_team')
r = await rpc('p2', 'create_team', ' alpha ', '', ''); ok('team name unique (case/space-insensitive)', r.v.reason === 'name_taken', JSON.stringify(r.v))
r = await rpc('p2', 'create_team', 'x', '', ''); ok('short team name rejected', r.v.reason === 'invalid_name')
r = await rpc('p2', 'login_with_code', '000000', 'Bob'); ok('wrong code rejected', r.v.reason === 'invalid_code')
r = await rpc('p2', 'login_with_code', team.joinCode, 'Bob'); ok('log in with code + name works', r.v.ok === true && r.v.team.members.length === 2, JSON.stringify(r.v))
await rpc('p3', 'login_with_code', team.joinCode, 'Cy'); await rpc('p4', 'login_with_code', team.joinCode, 'Di')
r = await rpc('p5', 'login_with_code', team.joinCode, 'Eve'); ok('5th member rejected (team_full)', r.v.reason === 'team_full', JSON.stringify(r.v))
for (let i = 0; i < 8; i++) await rpc('solo', 'login_with_code', '11111' + i, 'S')
r = await rpc('solo', 'login_with_code', team.joinCode, 'S'); ok('code guessing throttled', r.v.reason === 'too_many', JSON.stringify(r.v))
r = await rpc('p2', 'get_my_profile'); ok('member sees team + code + names', r.v.team.joinCode === team.joinCode && r.v.team.members.map((m) => m.name).includes('Priya'))
r = await rpc('p5', 'login_with_code', team.joinCode, ' bob '); ok('same name = member coming back: takes the seat even when full', r.v.ok === true && r.v.team.members.length === 4, JSON.stringify(r.v))
r = await rpc('p2', 'get_my_profile'); ok('the older session loses the team', r.v.team === null)
r = await rpc('p2', 'get_mission_state'); ok('older session can no longer read the mission', !r.ok && /no_team/.test(r.err))
r = await rpc('p2', 'login_with_code', team.joinCode, ''); ok('empty name rejected', r.v.reason === 'invalid_name')

// ---- missions: fresh database ships a sample Mission 1 (MISSION); real questions are authored in the SQL editor
r = await rpc('p1', 'get_mission_state')
ok('sample Mission 1 is open, Missions 2-4 locked', r.v.questions[0].status === 'available' && r.v.questions.slice(1).every((q) => q.status === 'locked'), JSON.stringify(r.v.questions.map((q) => q.status)))
ok('sample answer is not in the payload', !/MISSION$/i.test(JSON.stringify(r.v).replace('Type MISSION to solve it', '')))
await db.exec(`select public.set_question(1, 'Q1', 'Largest animal?', array['Blue Whale', 'whale'], 'Go to the library')`)
await db.exec(`select public.set_question(2, 'Q2', 'Pick', array['B'], 'hint2', true, 'choice', '["A","B"]'::jsonb)`)
const secrets = (await db.query(`select * from public.question_secrets where idx=1`)).rows[0]
ok('answers stored hashed (no plaintext)', !JSON.stringify(secrets).toLowerCase().includes('whale') && secrets.answer_hashes.length === 2)
let bad = false; try { await db.exec(`select public.set_question(3, 'Q3', 'b', array[]::text[])`) } catch { bad = true }
ok('cannot activate a question with no answers', bad)

r = await rpc('p3', 'get_mission_state'); const st = r.v
ok('Q2 locked: only index + status', Object.keys(st.questions[1]).sort().join() === 'index,status', JSON.stringify(st.questions[1]))
ok('open Q1 payload has no answers and a hidden hint', !/whale|library|hash/i.test(JSON.stringify(st)) && st.questions[0].hint.status === 'hidden')
r = await rpc('p3', 'submit_answer', 2, 'B'); ok('cannot answer a locked mission', r.v.result === 'locked')
r = await rpc('p3', 'submit_answer', 1, 'nope'); ok('wrong answer -> incorrect, no state', r.v.result === 'incorrect' && !r.v.state)
r = await rpc('p3', 'submit_answer', 1, 'whale'); ok('immediate retry rate-limited', r.v.result === 'too_fast')
await db.exec(`update public.team_attempts set submitted_at = now() - interval '10 seconds'`)
r = await rpc('p4', 'submit_answer', 1, 'WHALE'); ok('a teammate solves it (shared progress)', r.v.result === 'correct' && r.v.state.questions[1].status === 'available')
ok('hint appears immediately on solving', r.v.state.questions[0].hint.text === 'Go to the library')
ok('response never contains accepted answers', !/Blue Whale/.test(JSON.stringify(r.v)))
r = await rpc('p3', 'submit_answer', 1, 'whale'); ok('resubmit -> already_solved', r.v.result === 'already_solved')
r = await rpc('p3', 'list_my_submissions'); ok('submissions listed with who', r.v.length === 2 && r.v[0].by)

// ---- teams are isolated
r = await rpc('solo', 'create_team', 'Beta', '', 'Sol'); ok('second team created', r.v.ok)
r = await rpc('solo', 'get_mission_state'); ok('Beta has fresh progress', r.v.questions[1].status === 'locked' && r.v.solvedCount === 0)

// ---- window
await db.exec(`update public.gameplay_settings set override_mode = 'closed'`)
r = await rpc('p1', 'get_mission_state'); ok('closed window blocks reading', !r.ok && /gameplay_closed/.test(r.err))
r = await rpc('p1', 'submit_answer', 2, 'B'); ok('closed window blocks answering', !r.ok && /gameplay_closed/.test(r.err))
await db.exec(`update public.gameplay_settings set override_mode = null`)
r = await rpc('p1', 'get_mission_state'); ok('schedule applies when the override is cleared (locked before 24 Oct 2026 08:30 IST)', !r.ok, r.err)
await db.exec(`update public.gameplay_settings set override_mode = 'open'`)

// ---- control: teams, leaderboard data, timers
const tid = (await db.query(`select id from public.teams where name='Alpha'`)).rows[0].id
r = await rpc('admin', 'admin_list_teams'); const alpha = r.v.find((t) => t.name === 'Alpha')
ok('organiser sees teams with member names and progress', r.v.length === 2 && alpha.members.length === 4 && alpha.solvedCount === 1 && alpha.lastSolvedAt, JSON.stringify(alpha).slice(0, 300))
ok('team list leaks no emails or join codes', !/@x\.com|joinCode/.test(JSON.stringify(r.v)))
r = await rpc('p1', 'get_my_timer'); ok('no timer yet', r.v.status === 'none')
r = await rpc('admin', 'admin_set_timer', null, 10); ok('set a 10 min timer for every team', r.ok, r.err)
r = await rpc('p1', 'get_my_timer'); ok('team sees idle timer with full duration', r.v.status === 'idle' && r.v.remainingMs === 600000, JSON.stringify(r.v))
r = await rpc('admin', 'admin_set_timer', tid, 0); ok('zero minutes rejected', !r.ok && /invalid/.test(r.err))
await rpc('admin', 'admin_start_timer', tid)
r = await rpc('p1', 'get_my_timer'); ok('start: Alpha running and counting down', r.v.status === 'running' && r.v.remainingMs <= 600000 && r.v.remainingMs > 590000, JSON.stringify(r.v))
r = await rpc('solo', 'get_my_timer'); ok('start for one team leaves the other idle', r.v.status === 'idle')
await db.exec(`update public.team_timers set deadline_at = now() + interval '5 minutes' where team_id = '${tid}'`)
await rpc('admin', 'admin_stop_timer', tid)
r = await rpc('p1', 'get_my_timer'); const frozen = r.v
ok('stop freezes the remaining time', frozen.status === 'stopped' && frozen.remainingMs > 295000 && frozen.remainingMs <= 300000, JSON.stringify(frozen))
await rpc('admin', 'admin_start_timer', tid)
r = await rpc('p1', 'get_my_timer'); ok('start again resumes from the frozen time', r.v.status === 'running' && r.v.remainingMs <= frozen.remainingMs)
await db.exec(`update public.team_timers set deadline_at = now() - interval '1 second' where team_id = '${tid}'`)
r = await rpc('p1', 'get_my_timer'); ok('a timer that ran out reads as finished', r.v.status === 'finished' && r.v.remainingMs === 0)
await rpc('admin', 'admin_start_timer', null); await rpc('admin', 'admin_stop_timer', null)
r = await rpc('solo', 'get_my_timer'); ok('start/stop with no team applies to every team', r.v.status === 'stopped')
r = await rpc('admin', 'admin_list_teams'); ok('organiser list carries each timer', r.v.every((t) => t.timer && t.timer.status))
r = await as('p1', `select public.admin_set_timer(null, 5)`); ok('player cannot touch timers', !r.ok && /forbidden/.test(r.err))
r = await rpc('admin', 'get_mission_state'); ok('an organiser has no team, so no mission', !r.ok && /no_team/.test(r.err))

// ---- leaving
r = await rpc('p4', 'leave_team'); ok('member leaves', r.v.ok)
console.log(`\n${pass} passed, ${fail} failed`)

// ---- upgrading a database that still has the old, larger schema must work too
const old = new PGlite({ extensions: { pgcrypto } })
await old.exec(`
  create schema auth; create schema extensions;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema auth, extensions to anon, authenticated;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
`)
const bak = process.env.OLD_SCHEMA
if (bak) {
  await old.exec(fs.readFileSync(bak, 'utf8'))
  await old.exec(sql)
  const left = (await old.query(`select count(*)::int c from information_schema.tables where table_schema='public' and table_name in ('announcements','round_scores','qualification_settings')`)).rows[0].c
  const fns = (await old.query(`select count(*)::int c from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'admin\\_%' and p.proname not in ('admin_list_teams','admin_set_timer','admin_start_timer','admin_stop_timer')`)).rows[0].c
  ok('upgrade from the old schema drops removed tables and functions', left === 0 && fns === 0, `tables ${left}, functions ${fns}`)
}
process.exit(fail ? 1 : 0)
