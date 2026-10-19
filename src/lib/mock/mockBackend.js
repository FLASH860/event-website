// DEV ONLY. Pretends to be the SERVER so the UI can be built and demoed. Not secure, not real, state lives in this browser.
// It mimics real server behaviour on purpose: locked questions and unreleased hints are never returned, accepted answers
// never leave this file for team users, and repeated correct submissions do not unlock anything twice.
// ALL questions/answers/hints/locations below are obvious PLACEHOLDERS, not event content.
import { DEV_ACCOUNTS } from '../../auth/devAccounts.js'

const KEY = 'ras_mock_db'
const ph = (n) => ({
  index: n, active: true, title: `Placeholder question ${n}`, body: `DEMO placeholder, not a real question.\nType DEMO${n} to solve it.`,
  type: 'text', options: [], accepted: [`DEMO${n}`], caseSensitive: false, attemptsAllowed: null, penalty: null,
  hint: { text: `DEMO placeholder hint ${n}. Not a real location.` },
  component: { id: `DEMO-C${n}`, location: `Demo checkpoint ${n} (placeholder)`, method: 'qr', requiredForProgression: true, token: `DEMO-Q${n}`, active: true },
})
const seed = () => ({ settings: { progressionMode: 'answer', hintReveal: 'on_correct_answer' }, questions: [1, 2, 3, 4].map(ph), teams: {}, audit: [] })
// Older saved DBs may predate rounds/scoring/announcements; fill defaults without touching existing data.
const ensure = (db) => {
  db.rounds ||= {}            // { [n]: { status, durationMin } } organiser-entered only
  db.scores ||= {}            // { [teamCode]: { [round]: number } } organiser-entered only; never computed here
  db.qualification ||= { criteria: '', slots: null, cutoff: null, tieBreaker: null, decisions: {}, published: false }
  db.announcements ||= []
  db.briefing ||= {}          // { [teamCode]: completedAtISO } first completion only; replays never touch it
  return db
}
const read = () => { try { return ensure(JSON.parse(localStorage.getItem(KEY)) || seed()) } catch { return ensure(seed()) } }
const save = (db) => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ } }
const who = () => { try { return JSON.parse(sessionStorage.getItem('ras_mock_auth')) } catch { return null } }
const need = (role) => { const a = who(); if (!a || a.role !== role) throw new Error('forbidden'); return a }
const rec = (db, code) => (db.teams[code] ||= { solved: [], recovered: {}, attempts: {}, hintReleased: [], submissions: [] })
const log = (db, actor, action, detail) => db.audit.unshift({ at: new Date().toISOString(), actor, action, detail })
const norm = (s, cs) => { const t = String(s ?? '').trim().replace(/\s+/g, ' '); return cs ? t : t.toLowerCase() }

// Has question i been "cleared" so that i+1 may unlock? Depends on the organiser-chosen progression mode.
function cleared(db, t, i) {
  const q = db.questions[i - 1], m = db.settings.progressionMode, solved = t.solved.includes(i), r = t.recovered[i]
  const need = q.component.requiredForProgression
  if (m === 'answer') return solved
  if (m === 'recovery') return need ? Boolean(r) : solved
  return solved && (!need || r?.via === 'organiser')
}
const unlocked = (db, t, i) => db.questions[i - 1].active && (i === 1 || (unlocked(db, t, i - 1) && cleared(db, t, i - 1)))
const hintOn = (db, t, i) => (db.settings.hintReveal === 'on_correct_answer' ? t.solved.includes(i) : t.hintReleased.includes(i))

function teamState(db, code) {
  const t = rec(db, code), n = db.questions.length
  const questions = db.questions.map((q) => {
    const i = q.index
    if (!unlocked(db, t, i)) return { index: i, status: 'locked' } // NO content for locked questions
    const solved = t.solved.includes(i), r = t.recovered[i]
    return {
      index: i, status: solved ? 'solved' : 'available', title: q.title, body: q.body, type: q.type, options: q.type === 'choice' ? q.options : [],
      attemptsUsed: t.attempts[i] || 0, attemptsAllowed: q.attemptsAllowed,
      hint: hintOn(db, t, i) ? { status: 'unlocked', text: q.hint.text } : { status: 'hidden' },
      component: { id: q.component.id, method: q.component.method, requiredForProgression: q.component.requiredForProgression, status: r ? 'recovered' : 'not_recovered', via: r?.via ?? null },
      nextUnlocked: i < n && unlocked(db, t, i + 1),
    }
  })
  const cur = questions.find((q) => q.status === 'available') || questions.find((q) => q.status === 'solved' && !q.nextUnlocked && q.index < n)
  return {
    settings: db.settings, questions, currentIndex: cur?.index ?? null,
    solvedCount: t.solved.length, complete: t.solved.length === n && db.questions.every((q) => cleared(db, t, q.index)),
  }
}

// ---------- team API ----------
export async function getMissionState() { const a = need('team'); const db = read(); return teamState(db, a.team.code) }

export async function submitAnswer(index, answer) {
  const a = need('team'), db = read(), t = rec(db, a.team.code), q = db.questions[index - 1]
  if (!q || !unlocked(db, t, index)) return { result: 'locked' }
  if (t.solved.includes(index)) return { result: 'already_solved' }
  if (q.attemptsAllowed != null && (t.attempts[index] || 0) >= q.attemptsAllowed) return { result: 'attempts_exhausted' }
  const ok = q.accepted.some((x) => norm(x, q.caseSensitive) === norm(answer, q.caseSensitive))
  t.attempts[index] = (t.attempts[index] || 0) + 1
  t.submissions.unshift({ questionIndex: index, submittedAt: new Date().toISOString(), answer: String(answer), result: ok ? 'correct' : 'incorrect' })
  if (ok) t.solved.push(index)
  save(db)
  return { result: ok ? 'correct' : 'incorrect', state: teamState(db, a.team.code) }
}

export async function listMySubmissions() { const a = need('team'); return rec(read(), a.team.code).submissions }

export async function verifyCheckpoint(token) {
  const a = need('team'), db = read(), t = rec(db, a.team.code)
  const q = db.questions.find((x) => x.component.token === token && x.component.method === 'qr' && x.component.active)
  if (!q) return { result: 'invalid' }
  if (!unlocked(db, t, q.index)) return { result: 'wrong_stage' }
  if (t.recovered[q.index]) return { result: 'already_processed' }
  t.recovered[q.index] = { via: 'qr', at: new Date().toISOString() }
  save(db)
  return { result: 'valid', questionIndex: q.index, state: teamState(db, a.team.code) }
}

// ---------- organiser API ----------
export async function adminGetSettings() { need('admin'); return read().settings }
export async function adminSaveSettings(s) { const a = need('admin'), db = read(); db.settings = { ...db.settings, ...s }; log(db, a.email, 'settings_changed', JSON.stringify(s)); save(db); return db.settings }
export async function adminListQuestions() { need('admin'); return read().questions }
export async function adminSaveQuestion(index, q) {
  const a = need('admin'), db = read(); db.questions[index - 1] = { ...db.questions[index - 1], ...q, index }
  log(db, a.email, 'question_saved', `Q${index}`); save(db); return db.questions[index - 1]
}
export async function adminListTeams() {
  need('admin'); const db = read()
  return DEV_ACCOUNTS.filter((x) => x.role === 'team').map((x) => {
    const t = rec(db, x.team.code), st = teamState(db, x.team.code)
    const status = st.complete ? 'completed' : t.solved.length || Object.keys(t.attempts).length ? 'in progress' : 'not started'
    return { teamCode: x.team.code, teamName: x.team.name, college: '—', currentIndex: st.currentIndex, solvedCount: st.solvedCount, status,
      components: db.questions.map((q) => ({ index: q.index, status: t.recovered[q.index] ? 'recovered' : 'not_recovered', via: t.recovered[q.index]?.via ?? null, solved: t.solved.includes(q.index), hint: hintOn(db, t, q.index) })) }
  })
}
export async function adminApproveRecovery(teamCode, index) { const a = need('admin'), db = read(); rec(db, teamCode).recovered[index] = { via: 'organiser', at: new Date().toISOString(), by: a.email }; log(db, a.email, 'recovery_approved', `${teamCode} Q${index}`); save(db) }
export async function adminReleaseHint(teamCode, index) { const a = need('admin'), db = read(), t = rec(db, teamCode); if (!t.hintReleased.includes(index)) t.hintReleased.push(index); log(db, a.email, 'hint_released', `${teamCode} Q${index}`); save(db) }
export async function adminResetTeam(teamCode) { const a = need('admin'), db = read(); db.teams[teamCode] = undefined; delete db.teams[teamCode]; log(db, a.email, 'team_progress_reset', teamCode); save(db) }
export async function adminAudit() { need('admin'); return read().audit }

// ---------- announcements ----------
export async function listAnnouncements() { need('team'); return read().announcements.filter((x) => x.published) }
export async function adminListAnnouncements() { need('admin'); return read().announcements }
export async function adminSaveAnnouncement(a) {
  const x = need('admin'), db = read(), title = String(a.title || '').trim(), body = String(a.body || '').trim()
  if (!title || !body) throw new Error('invalid')
  db.announcements.unshift({ id: `a${Date.now()}`, title, body, kind: a.kind || 'info', published: true, at: new Date().toISOString() })
  log(db, x.email, 'announcement_published', title); save(db)
}
export async function adminRetractAnnouncement(id) { const x = need('admin'), db = read(); const i = db.announcements.findIndex((a) => a.id === id); if (i >= 0) { log(db, x.email, 'announcement_retracted', db.announcements[i].title); db.announcements.splice(i, 1); save(db) } }

// ---------- rounds, scores, qualification (all values are entered by organisers; nothing is calculated into a decision) ----------
export async function adminGetRounds() { need('admin'); return read().rounds }
export async function adminSaveRound(n, r) {
  const x = need('admin'), db = read(), d = r.durationMin === '' || r.durationMin == null ? null : Number(r.durationMin)
  if (d != null && (!Number.isFinite(d) || d <= 0)) throw new Error('invalid')
  db.rounds[n] = { status: r.status || 'not_started', durationMin: d }
  log(db, x.email, 'round_configured', `Round ${n}: ${db.rounds[n].status}, duration ${d ?? 'unset'}`); save(db)
}
export async function adminGetResults(maxByRound) {
  need('admin'); const db = read()
  return { qualification: db.qualification, teams: DEV_ACCOUNTS.filter((a) => a.role === 'team').map((a) => ({ teamCode: a.team.code, teamName: a.team.name, scores: db.scores[a.team.code] || {} })), maxByRound }
}
export async function adminSaveScore(teamCode, round, value, max) {
  const x = need('admin'), db = read(), v = value === '' || value == null ? null : Number(value)
  if (v != null && (!Number.isFinite(v) || v < 0 || v > max)) throw new Error('out_of_range') // server must also enforce 0..max
  db.scores[teamCode] ||= {}
  if (v == null) delete db.scores[teamCode][round]; else db.scores[teamCode][round] = v
  log(db, x.email, 'score_recorded', `${teamCode} round ${round}: ${v ?? 'cleared'}`); save(db)
}
export async function adminSaveQualification(q) {
  const x = need('admin'), db = read(), cur = db.qualification
  db.qualification = { ...cur, criteria: String(q.criteria ?? cur.criteria), slots: q.slots === '' || q.slots == null ? null : Number(q.slots), cutoff: q.cutoff === '' || q.cutoff == null ? null : Number(q.cutoff), tieBreaker: q.tieBreaker || null }
  log(db, x.email, 'qualification_criteria_saved', JSON.stringify({ slots: db.qualification.slots, cutoff: db.qualification.cutoff, tieBreaker: db.qualification.tieBreaker })); save(db)
}
export async function adminDecideQualification(teamCode, decision) {
  const x = need('admin'), db = read()
  if (decision === 'pending') delete db.qualification.decisions[teamCode]; else db.qualification.decisions[teamCode] = decision
  log(db, x.email, 'qualification_decision', `${teamCode}: ${decision}`); save(db)
}
export async function adminPublishResults(published) { const x = need('admin'), db = read(); db.qualification.published = Boolean(published); log(db, x.email, published ? 'results_published' : 'results_unpublished', ''); save(db) }
export async function getMyProgress() {
  const a = need('team'), db = read(), pub = db.qualification.published, mine = db.scores[a.team.code] || {}
  // Scores and decisions are withheld until organisers publish them.
  return { published: pub, scores: pub ? mine : null, decision: pub ? db.qualification.decisions[a.team.code] || null : null, criteriaConfigured: Boolean(db.qualification.criteria || db.qualification.slots != null || db.qualification.cutoff != null) }
}

// ---------- mission briefing (presentation only: never touches progress, timers or unlocks) ----------
export async function getBriefingStatus() { const a = need('team'), at = read().briefing[a.team.code]; return { completed: Boolean(at), completedAt: at || null } }
export async function completeBriefing() {
  const a = need('team'), db = read()
  db.briefing[a.team.code] ||= new Date().toISOString() // idempotent: keeps the FIRST completion time
  save(db); return { completed: true, completedAt: db.briefing[a.team.code] }
}
