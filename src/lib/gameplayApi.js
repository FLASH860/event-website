import { rpc } from './api'
import { EVENT } from '../config/eventConfig'

// Returns { enabled, startsAt, endsAt, override, serverNow, confirmed, timeZone }.
// The SERVER supplies the window and its own clock (serverNow) so a wrong device clock is corrected. The real enforcement is
// inside every gameplay function in the database; this only drives what the page shows.
export async function fetchGameplayStatus() {
  let data
  try { data = await rpc('get_gameplay_status') } catch { throw new Error('Could not load the mission window.') }
  if (!data) throw new Error('Could not load the mission window.')
  return {
    enabled: data.enabled, startsAt: data.starts_at, endsAt: data.ends_at,
    override: data.override_mode ? { mode: data.override_mode, until: data.override_until } : null,
    confirmed: data.confirmed, timeZone: EVENT.timeZone, serverNow: data.server_now,
  }
}
