import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
// Only the public anon key is used. What an organiser may do is decided by the database (is_admin()), not by this app.
export const supabase = configured ? createClient(url, key, { auth: { storageKey: 'ras-admin-auth' } }) : null

const MESSAGES = {
  forbidden: 'Not allowed: this account is not an organiser.',
  invalid: 'Enter a number of minutes (not 0, at most 600).',
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

// Everything the console does: read the teams, and add time to / start / stop timers. A team id of null means every team.
export const api = {
  profile: () => rpc('get_my_profile'),
  teams: () => rpc('admin_list_teams'),
  addTime: (team, minutes) => rpc('admin_add_time', { p_team: team, p_minutes: minutes }),
  startTimer: (team) => rpc('admin_start_timer', { p_team: team }),
  stopTimer: (team) => rpc('admin_stop_timer', { p_team: team }),
}
