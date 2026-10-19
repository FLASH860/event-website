import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Runs supabase/schema.sql in an in-memory Postgres (PGlite) with a stub of Supabase's auth schema, then attacks it:
// players reading tables, guessing answers, skipping questions, calling admin functions. Run: npm run test:db

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
const roleOfP1 = (await db.query(`select role from public.profiles where id=$1`, [U.p1])).rows[0].role
ok('signup metadata cannot set role=admin', roleOfP1 === 'team')

async function as(who, query, params = [], role = 'authenticated') {
  await db.exec(`reset role; select set_config('test.uid', '${who ? U[who] : ''}', false); set role ${role};`)
  try { const r = await db.query(query, params); await db.exec('reset role'); return { ok: true, rows: r.rows, v: r.rows[0] && Object.values(r.rows[0])[0] } }
  catch (e) { await db.exec('reset role'); return { ok: false, err: e.message } }
}
const rpc = (who, fn, ...args) => as(who, `select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a)))

// ---- direct table access is impossible
for (const t of ['question_secrets', 'profiles', 'teams', 'team_attempts', 'audit_log', 'components', 'questions', 'announcements']) {
  const r = await as('p1', `select * from public.${t}`)
  ok(`player cannot SELECT ${t} directly`, !r.ok && /permission denied/.test(r.err), r.err)
}
const w = await as('p1', `update public.profiles set role='admin' where id='${U.p1}'`)
ok('player cannot UPDATE profiles (self-promote)', !w.ok && /permission denied/.test(w.err), w.err)
const w2 = await as('p1', `insert into public.team_progress (team_id, idx, solved_at) values (gen_random_uuid(), 1, now())`)
ok('player cannot INSERT progress', !w2.ok)
const anonProfile = await as(null, `select public.get_my_profile()`, [], 'anon')
ok('anon cannot call get_my_profile', !anonProfile.ok && /permission denied/.test(anonProfile.err), anonProfile.err)
const anonGp = await as(null, `select public.get_gameplay_status()`, [], 'anon')
ok('anon can read gameplay status', anonGp.ok && anonGp.v.state === 'open', JSON.stringify(anonGp))
const internal = await as('p1', `select public._need_admin()`)
ok('internal helpers are not callable', !internal.ok)
const hashfn = await as('p1', `select public._answer_hash('a','b')`)
ok('hash helper is not callable', !hashfn.ok)

// ---- admin RPCs reject players
for (const fn of ['admin_list_teams()', 'admin_list_questions()', 'admin_audit(10)', 'admin_stats()']) {
  const r = await as('p1', `select public.${fn}`)
  ok(`player blocked from ${fn}`, !r.ok && /forbidden/.test(r.err), r.err)
}
const adm = await rpc('admin', 'admin_stats'); ok('admin can call admin_stats', adm.ok, adm.err)

// ---- teams
let r = await rpc('p5', 'get_mission_state'); ok('no-team player cannot read mission', !r.ok && /no_team/.test(r.err), r.err)
r = await rpc('p1', 'create_team', 'Alpha', 'PES', 'Priya'); ok('create_team ok', r.v.ok === true, JSON.stringify(r.v))
const team = r.v.team; ok('join code is 6 digits', /^\d{6}$/.test(team.joinCode), team.joinCode)
r = await rpc('p1', 'create_team', 'Other', '', ''); ok('cannot create second team', r.v.reason === 'already_in_team')
r = await rpc('p2', 'create_team', ' alpha ', '', ''); ok('team name unique (case/space-insensitive)', r.v.reason === 'name_taken', JSON.stringify(r.v))
r = await rpc('p2', 'create_team', 'x', '', ''); ok('short name rejected', r.v.reason === 'invalid_name')
r = await rpc('p2', 'login_with_code', '000000', 'Bob'); ok('wrong code rejected', r.v.reason === 'invalid_code')
r = await rpc('p2', 'login_with_code', team.joinCode, 'Bob'); ok('join with code works', r.v.ok === true && r.v.team.members.length === 2, JSON.stringify(r.v))
await rpc('p3', 'login_with_code', team.joinCode, 'Cy'); await rpc('p4', 'login_with_code', team.joinCode, 'Di')
r = await rpc('p5', 'login_with_code', team.joinCode, 'Eve'); ok('5th member rejected (team_full)', r.v.reason === 'team_full', JSON.stringify(r.v))
for (let i = 0; i < 8; i++) await rpc('solo', 'login_with_code', '11111' + i, 'S')
r = await rpc('solo', 'login_with_code', team.joinCode, 'S'); ok('join code guessing throttled', r.v.reason === 'too_many', JSON.stringify(r.v))
r = await rpc('p2', 'get_my_profile'); ok('profile shows team + join code to a member', r.v.team.joinCode === team.joinCode && r.v.role === 'team')
r = await rpc('p5', 'login_with_code', team.joinCode, ' bob '); ok('same name = member coming back: takes over even when full', r.v.ok === true && r.v.team.members.length === 4, JSON.stringify(r.v))
r = await rpc('p2', 'get_my_profile'); ok('the older session loses the team', r.v.team === null)
r = await rpc('p2', 'get_mission_state'); ok('older session can no longer read the mission', !r.ok && /no_team/.test(r.err))
r = await rpc('p2', 'login_with_code', team.joinCode, ''); ok('empty name rejected', r.v.reason === 'invalid_name')

// ---- content (admin)
const ans = ['Blue Whale', 'whale']
r = await rpc('admin', 'admin_save_question', 1, { active: true, title: 'Q1', body: 'b' }); ok('cannot activate question without answers', !r.ok && /answers_required/.test(r.err), r.err)
r = await rpc('admin', 'admin_save_question', 1, { active: true, title: 'Q1', body: 'Largest animal?', type: 'text', acceptedAnswers: ans, hintText: 'Go to the library', component: { code: 'HEAD', locationNote: 'secret place', method: 'qr' } })
ok('admin saves Q1', r.ok, r.err)
r = await rpc('admin', 'admin_save_question', 2, { active: true, title: 'Q2', body: 'Pick', type: 'choice', options: ['A', 'B'], acceptedAnswers: ['B'], hintText: 'hint2' }); ok('admin saves Q2 (choice)', r.ok, r.err)
const secrets = (await db.query(`select * from public.question_secrets where idx=1`)).rows[0]
ok('answers stored hashed (no plaintext)', !JSON.stringify(secrets).toLowerCase().includes('whale') && secrets.answer_hashes.length === 2)
r = await rpc('admin', 'admin_list_questions'); ok('admin_list_questions leaks no answers/hash', !JSON.stringify(r.v).toLowerCase().includes('whale') && !/hash/i.test(JSON.stringify(r.v)) && r.v[0].answerCount === 2)
r = await rpc('admin', 'admin_check_answer', 1, ' BLUE   whale '); ok('admin can test an answer (normalised)', r.v === true)

// ---- mission
r = await rpc('p3', 'get_mission_state'); const st = r.v
ok('teammate sees shared state', st.questions[0].status === 'available')
ok('Q2 locked: only index+status', Object.keys(st.questions[1]).sort().join() === 'index,status' && st.questions[1].status === 'locked', JSON.stringify(st.questions[1]))
ok('Q1 payload has no answers/hints before solving', !/whale|library|secret|hash/i.test(JSON.stringify(st)) && st.questions[0].hint.status === 'hidden', JSON.stringify(st.questions[0]))
r = await rpc('p3', 'submit_answer', 2, 'B'); ok('cannot answer locked Q2', r.v.result === 'locked')
r = await rpc('p3', 'submit_answer', 1, 'nope'); ok('wrong answer -> incorrect, no state', r.v.result === 'incorrect' && !r.v.state, JSON.stringify(r.v))
r = await rpc('p3', 'submit_answer', 1, 'whale'); ok('immediate retry rate-limited', r.v.result === 'too_fast', JSON.stringify(r.v))
await db.exec(`update public.team_attempts set submitted_at = now() - interval '10 seconds'`)
r = await rpc('p4', 'submit_answer', 1, 'WHALE'); ok('teammate submits correct answer', r.v.result === 'correct' && r.v.state.questions[1].status === 'available', JSON.stringify(r.v).slice(0, 300))
ok('hint unlocked only after solving', r.v.state.questions[0].hint.text === 'Go to the library')
ok('response never contains accepted answers', !/Blue Whale/.test(JSON.stringify(r.v)))
r = await rpc('p3', 'submit_answer', 1, 'whale'); ok('resubmit -> already_solved', r.v.result === 'already_solved')
r = await rpc('p3', 'list_my_submissions'); ok('submissions listed with who', r.v.length === 2 && r.v[0].by)
const outsider = await rpc('solo', 'list_my_submissions'); ok('other team/no-team cannot see submissions', !outsider.ok)

// ---- teams are isolated
r = await rpc('solo', 'create_team', 'Beta', '', 'Sol'); ok('second team created', r.v.ok)
r = await rpc('solo', 'get_mission_state'); ok('team Beta has fresh progress (Q2 locked)', r.v.questions[1].status === 'locked' && r.v.solvedCount === 0)

// ---- QR
r = await rpc('admin', 'admin_generate_token', 1); const tok = r.v; ok('token generated', /^RAS[0-9a-f]{32}$/.test(tok))
ok('raw token not stored', (await db.query(`select count(*)::int c from public.components where token_hash = $1`, [tok])).rows[0].c === 0)
r = await rpc('p1', 'verify_checkpoint', 'bogus'); ok('bad token invalid', r.v.result === 'invalid')
r = await rpc('solo', 'verify_checkpoint', tok); ok('token valid for unlocked Q1 (solo)', r.v.result === 'valid', JSON.stringify(r.v).slice(0, 200))
r = await rpc('solo', 'verify_checkpoint', tok); ok('replay -> already_processed', r.v.result === 'already_processed')
await rpc('admin', 'admin_generate_token', 1)
r = await rpc('p1', 'verify_checkpoint', tok); ok('old token dead after regenerate', r.v.result === 'invalid')

// ---- progression modes
await rpc('admin', 'admin_save_settings', { progressionMode: 'answer_and_approval' })
r = await rpc('p1', 'get_mission_state'); ok('answer_and_approval: Q2 locked until organiser approves', r.v.questions[1].status === 'locked', JSON.stringify(r.v.questions[1]) + JSON.stringify((await db.query('select * from public.mission_settings')).rows) + JSON.stringify((await db.query('select * from public.component_recoveries')).rows))
const tid = (await db.query(`select id from public.teams where name='Alpha'`)).rows[0].id
await rpc('admin', 'admin_approve_recovery', tid, 1)
r = await rpc('p1', 'get_mission_state'); ok('after approval Q2 unlocked', r.v.questions[1].status === 'available')
await rpc('admin', 'admin_save_settings', { progressionMode: 'answer', hintReveal: 'organiser_release' })
r = await rpc('p1', 'get_mission_state'); ok('organiser_release hides hint even when solved', r.v.questions[0].hint.status === 'hidden')
await rpc('admin', 'admin_release_hint', tid, 1)
r = await rpc('p1', 'get_mission_state'); ok('released hint shows', r.v.questions[0].hint.status === 'unlocked')

// ---- admin team monitor
r = await rpc('admin', 'admin_list_teams'); const alpha = r.v.find((t) => t.name === 'Alpha')
ok('admin sees members/emails/progress', alpha.members.length === 4 && alpha.solvedCount === 1 && alpha.currentIndex === 2 && alpha.members[0].email, JSON.stringify(alpha).slice(0, 300))
r = await rpc('admin', 'admin_list_attempts', 50, null); ok('admin attempt feed', r.v.length >= 2 && r.v[0].teamName)

// ---- gameplay window
await rpc('admin', 'admin_save_gameplay', { overrideMode: 'closed' })
r = await rpc('p1', 'get_mission_state'); ok('closed window blocks gameplay', !r.ok && /gameplay_closed/.test(r.err), r.err)
r = await rpc('p1', 'submit_answer', 2, 'B'); ok('closed window blocks submit', !r.ok && /gameplay_closed/.test(r.err))
await rpc('admin', 'admin_save_gameplay', { overrideMode: '' })
r = await rpc('p1', 'get_mission_state'); ok('after clearing override, schedule applies (locked before 24 Oct 2026 08:30 IST)', !r.ok, r.err)
await rpc('admin', 'admin_save_gameplay', { overrideMode: 'open' })

// ---- results
r = await rpc('admin', 'admin_save_score', tid, 1, 101); ok('score above max rejected', !r.ok && /out_of_range/.test(r.err))
r = await rpc('admin', 'admin_save_score', tid, 1, 80); ok('score saved', r.ok)
r = await rpc('p1', 'get_my_progress'); ok('scores hidden until published', r.v.published === false && r.v.scores === null)
await rpc('admin', 'admin_decide_qualification', tid, 'qualified'); await rpc('admin', 'admin_publish_results', true)
r = await rpc('p1', 'get_my_progress'); ok('published scores + decision visible to own team', r.v.scores['1'] == 80 && r.v.decision === 'qualified', JSON.stringify(r.v))

// ---- announcements
r = await rpc('admin', 'admin_save_announcement', { title: 'Hi', body: 'There', kind: 'safety' }); ok('announce', r.ok, r.err)
r = await rpc('p1', 'list_announcements'); ok('players read announcements', r.v.length === 1)
r = await rpc('p1', 'admin_save_announcement', { title: 'x', body: 'y' }); ok('player cannot announce', !r.ok)

// ---- admin cannot use player RPCs as a team
r = await rpc('admin', 'get_mission_state'); ok('admin has no team -> no mission', !r.ok && /no_team/.test(r.err))

// ---- leave / delete
r = await rpc('p4', 'leave_team'); ok('member leaves', r.v.ok)
r = await rpc('admin', 'admin_remove_member', U.p3); r = await rpc('admin', 'admin_audit', 10); ok('audit log written', r.v.length > 3 && r.v[0].actor)
await rpc('admin', 'admin_reset_team', tid); r = await rpc('p1', 'get_mission_state'); ok('reset team clears progress', r.v.solvedCount === 0)
r = await rpc('admin', 'admin_delete_team', tid); r = await rpc('p1', 'get_my_profile'); ok('deleted team -> member has no team', r.v.team === null)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
