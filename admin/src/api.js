import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
// Only the public anon key is used. What an organiser may do is decided by the database (is_admin()), not by this app.
export const supabase = configured ? createClient(url, key, { auth: { storageKey: 'ras-admin-auth' } }) : null

const MESSAGES = {
  forbidden: 'Not allowed: this account is not an organiser.',
  bad_amount: 'Enter a number of minutes above 0.',
  not_started: 'That team has no stopwatch yet. Start it first.',
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

// Everything the console does: read the teams, and start / stop / reset / log their stopwatches. A team id of null means every team.
export const api = {
  profile: () => rpc('get_my_profile'),
  teams: () => rpc('admin_list_teams'),
  startTimer: (team) => rpc('admin_start_timer', { p_team: team }),
  stopTimer: (team) => rpc('admin_stop_timer', { p_team: team }),
  resetTimer: (team) => rpc('admin_reset_timer', { p_team: team }),
  adjustTime: (team, seconds) => rpc('admin_adjust_time', { p_team: team, p_seconds: seconds }),
  logTime: (team, note) => rpc('admin_log_time', { p_team: team, p_note: note }),
  timeLog: (team) => rpc('admin_time_log', { p_team: team }),
}
