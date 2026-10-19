// TODO(BACKEND): backend integration point for the question / hint / progression system.
// Contracts, SQL and rules: docs/BACKEND_HANDOVER.md and supabase/schema.sql. All decisions (answer correctness,
// unlocking, hint release, attempts, deadlines) are made by the SERVER. The browser only displays results.
import { supabase, isBackendConfigured, NotConnectedError } from './supabase'
import { mockBackend } from './mock'

const sid = () => { try { return localStorage.getItem('ras_team_session_id') } catch { return null } }
// TODO(BACKEND): every gameplay RPC takes p_session_id so the server can enforce ONE LIVE SESSION PER TEAM.
async function rpc(name, args = {}) {
  if (!isBackendConfigured) throw new NotConnectedError()
  const { data, error } = await supabase.rpc(name, args)
  if (error) { const e = new Error(error.message); e.code = /gameplay_closed/.test(error.message) ? 'closed' : /no_active_team_session/.test(error.message) ? 'session' : 'network'; throw e }
  return data
}
async function run(fn, args, rpcName, rpcArgs) {
  const m = await mockBackend()
  if (m) return m[fn](...args)
  return rpc(rpcName, rpcArgs)
}

/* ---------- team ---------- */
// Returns { settings, questions[], currentIndex, solvedCount, complete }. Locked questions arrive as { index, status:'locked' } ONLY.
// TODO(BACKEND): RPC get_mission_state(p_session_id) -> jsonb (see schema.sql). Must never include locked content or unreleased hints.
export const getMissionState = () => run('getMissionState', [], 'get_mission_state', { p_session_id: sid() })

// -> { result: 'correct'|'incorrect'|'already_solved'|'attempts_exhausted'|'locked'|'late', state? }
// TODO(BACKEND): RPC submit_answer(p_session_id, p_question int, p_answer text). Atomic and idempotent; checks window, deadline, attempts.
export const submitAnswer = (index, answer) => run('submitAnswer', [index, answer], 'submit_answer', { p_session_id: sid(), p_question: index, p_answer: answer })

// TODO(BACKEND): RPC list_my_submissions(p_session_id) -> [{questionIndex, submittedAt, answer, result}]
export const listMySubmissions = () => run('listMySubmissions', [], 'list_my_submissions', { p_session_id: sid() })

// -> { result: 'valid'|'invalid'|'already_processed'|'wrong_stage'|'not_authorised', questionIndex?, state? }
// TODO(BACKEND): RPC verify_checkpoint(p_session_id, p_token). Opaque token; replay-safe.
export const verifyCheckpoint = (token) => run('verifyCheckpoint', [token], 'verify_checkpoint', { p_session_id: sid(), p_token: token })

/* ---------- organiser (admin-only on the server) ---------- */
// TODO(BACKEND): all admin_* RPCs must check is_admin() and write an audit_log row.
export const adminGetSettings = () => run('adminGetSettings', [], 'admin_get_settings', {})
export const adminSaveSettings = (s) => run('adminSaveSettings', [s], 'admin_save_settings', { p_settings: s })
export const adminListQuestions = () => run('adminListQuestions', [], 'admin_list_questions', {})
export const adminSaveQuestion = (i, q) => run('adminSaveQuestion', [i, q], 'admin_save_question', { p_index: i, p_question: q })
export const adminListTeams = () => run('adminListTeams', [], 'admin_list_teams', {})
export const adminApproveRecovery = (code, i) => run('adminApproveRecovery', [code, i], 'admin_approve_recovery', { p_team_code: code, p_index: i })
export const adminReleaseHint = (code, i) => run('adminReleaseHint', [code, i], 'admin_release_hint', { p_team_code: code, p_index: i })
export const adminResetTeam = (code) => run('adminResetTeam', [code], 'admin_reset_team', { p_team_code: code })
export const adminAudit = () => run('adminAudit', [], 'admin_audit', {})

/* ---------- announcements, rounds, scoring, qualification ---------- */
// TODO(BACKEND): RPCs list_announcements(p_session_id); admin_list_announcements, admin_save_announcement, admin_retract_announcement.
export const listAnnouncements = () => run('listAnnouncements', [], 'list_announcements', { p_session_id: sid() })
export const adminListAnnouncements = () => run('adminListAnnouncements', [], 'admin_list_announcements', {})
export const adminSaveAnnouncement = (a) => run('adminSaveAnnouncement', [a], 'admin_save_announcement', { p_announcement: a })
export const adminRetractAnnouncement = (id) => run('adminRetractAnnouncement', [id], 'admin_retract_announcement', { p_id: id })
// TODO(BACKEND): admin_get_rounds, admin_save_round(p_round, p_config). Server must keep official names and max points fixed.
export const adminGetRounds = () => run('adminGetRounds', [], 'admin_get_rounds', {})
export const adminSaveRound = (n, r) => run('adminSaveRound', [n, r], 'admin_save_round', { p_round: n, p_config: r })
// TODO(BACKEND): admin_get_results, admin_save_score(p_team, p_round, p_value) [server re-checks 0..max], admin_save_qualification,
// admin_decide_qualification(p_team, p_decision), admin_publish_results(p_published), get_my_progress(p_session_id).
export const adminGetResults = (max) => run('adminGetResults', [max], 'admin_get_results', {})
export const adminSaveScore = (code, round, v, max) => run('adminSaveScore', [code, round, v, max], 'admin_save_score', { p_team: code, p_round: round, p_value: v })
export const adminSaveQualification = (q) => run('adminSaveQualification', [q], 'admin_save_qualification', { p_qualification: q })
export const adminDecideQualification = (code, d) => run('adminDecideQualification', [code, d], 'admin_decide_qualification', { p_team: code, p_decision: d })
export const adminPublishResults = (b) => run('adminPublishResults', [b], 'admin_publish_results', { p_published: b })
export const getMyProgress = () => run('getMyProgress', [], 'get_my_progress', { p_session_id: sid() })

/* ---------- mission briefing ---------- */
// -> { completed: boolean, completedAt: string|null } for the AUTHENTICATED team only.
// TODO(BACKEND): RPC get_briefing_status() -> jsonb. Reads team_briefing for current_team_id(). No parameters: a team cannot ask about another team.
export const getBriefingStatus = () => run('getBriefingStatus', [], 'get_briefing_status', {})
// Idempotent. Called ONLY when the team finishes the briefing (final action). Replays never call it.
// TODO(BACKEND): RPC complete_briefing() -> jsonb. Inserts (current_team_id(), now()) ON CONFLICT DO NOTHING.
export const completeBriefing = () => run('completeBriefing', [], 'complete_briefing', {})
