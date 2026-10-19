// TODO(BACKEND): backend integration point. Contract and SQL are in docs/BACKEND_HANDOVER.md and supabase/schema.sql.
import { supabase, isBackendConfigured } from './supabase'
import { GAMEPLAY } from '../config/eventConfig'

// Returns { enabled, startsAt, endsAt, override, serverNow, source, confirmed, timeZone }.
// - With a backend: the SERVER supplies the window and its own clock (serverNow) so a wrong device clock is corrected.
// - Without one: PROTOTYPE fallback from eventConfig using the device clock. This is NOT secure access control.
// TODO(BACKEND): RPC get_gameplay_status() (public). Window + server clock. Real enforcement is assert_gameplay_open() in every gameplay RPC.
export async function fetchGameplayStatus() {
  if (!isBackendConfigured) {
    return { ...GAMEPLAY, serverNow: null, source: 'prototype' }
  }
  const { data, error } = await supabase.rpc('get_gameplay_status')
  if (error || !data) throw new Error('Could not load the mission window.')
  return {
    enabled: data.enabled, startsAt: data.starts_at, endsAt: data.ends_at,
    override: data.override_mode ? { mode: data.override_mode, until: data.override_until } : null,
    confirmed: data.confirmed, timeZone: GAMEPLAY.timeZone, serverNow: data.server_now, source: 'server',
  }
}
