import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
// Only the public anon key is used. What an admin may do is decided by the database (is_admin()), not by this app.
export const supabase = configured ? createClient(url, key, { auth: { storageKey: 'ras-admin-auth' } }) : null

const MESSAGES = {
  forbidden: 'Not allowed: this account is not an organiser.',
  answers_required: 'Add at least one accepted answer before making a question active.',
  options_required: 'A multiple-choice question needs at least two options.',
  out_of_range: 'That score is outside 0 to the round maximum.',
  invalid: 'Some of the values are not valid.',
  not_found: 'That item no longer exists.',
}
export async function rpc(name, args = {}) {
  if (!configured) throw new Error('Supabase keys are missing. Add them to .env.local in the project root.')
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    const hit = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    throw new Error(hit ? MESSAGES[hit] : error.message)
  }
  return data
}

export const api = {
  profile: () => rpc('get_my_profile'),
  stats: () => rpc('admin_stats'),
  teams: () => rpc('admin_list_teams'),
  approveRecovery: (team, index) => rpc('admin_approve_recovery', { p_team: team, p_index: index }),
  releaseHint: (team, index) => rpc('admin_release_hint', { p_team: team, p_index: index }),
  resetTeam: (team) => rpc('admin_reset_team', { p_team: team }),
  removeMember: (user) => rpc('admin_remove_member', { p_user: user }),
  deleteTeam: (team) => rpc('admin_delete_team', { p_team: team }),
  getSettings: () => rpc('admin_get_settings'),
  saveSettings: (s) => rpc('admin_save_settings', { p_settings: s }),
  getGameplay: () => rpc('admin_get_gameplay'),
  saveGameplay: (g) => rpc('admin_save_gameplay', { p_g: g }),
  questions: () => rpc('admin_list_questions'),
  saveQuestion: (index, q) => rpc('admin_save_question', { p_index: index, p_q: q }),
  checkAnswer: (index, answer) => rpc('admin_check_answer', { p_index: index, p_answer: answer }),
  generateToken: (index) => rpc('admin_generate_token', { p_index: index }),
  revokeToken: (index) => rpc('admin_revoke_token', { p_index: index }),
  attempts: (limit = 200, team = null) => rpc('admin_list_attempts', { p_limit: limit, p_team: team }),
  audit: (limit = 300) => rpc('admin_audit', { p_limit: limit }),
  announcements: () => rpc('admin_list_announcements'),
  saveAnnouncement: (a) => rpc('admin_save_announcement', { p_a: a }),
  retractAnnouncement: (id) => rpc('admin_retract_announcement', { p_id: id }),
  results: () => rpc('admin_get_results'),
  saveScore: (team, round, value) => rpc('admin_save_score', { p_team: team, p_round: round, p_value: value }),
  saveQualification: (q) => rpc('admin_save_qualification', { p_q: q }),
  decide: (team, decision) => rpc('admin_decide_qualification', { p_team: team, p_decision: decision }),
  publishResults: (b) => rpc('admin_publish_results', { p_published: b }),
}
