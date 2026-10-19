// TODO(BACKEND): backend integration point. Contract and SQL are in docs/BACKEND_HANDOVER.md and supabase/schema.sql.
import { supabase, isBackendConfigured, NotConnectedError } from './supabase'

// Data-layer contract for round timers. The SERVER is authoritative for start, deadline, status and pauses.
// Returns { roundId, status, startedAt, deadlineAt, durationMs, pausedRemainingMs, serverNow, source:'server' }.
// serverNow lets the client correct for a wrong device clock, so several devices show consistent time.
// TODO(BACKEND): RPC get_round_timer(p_round text) -> jsonb. Must call assert_gameplay_open() and assert_active_team_session().
export async function fetchRoundTimer(roundId) {
  if (!isBackendConfigured) throw new NotConnectedError()
  const { data, error } = await supabase.rpc('get_round_timer', { p_round: roundId })
  if (error || !data) throw new Error('Could not load the round timer.')
  return {
    roundId,
    status: data.status,
    startedAt: data.started_at,
    deadlineAt: data.deadline_at,
    durationMs: data.duration_ms,
    pausedRemainingMs: data.paused_remaining_ms,
    serverNow: data.server_now,
    source: 'server',
  }
}
// Pause / resume / extend are organiser actions and must be server functions that check permissions. Not implemented here.
