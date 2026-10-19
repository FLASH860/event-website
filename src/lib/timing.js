// Pure timing helpers. The display is DERIVED from authoritative timestamps; nothing here counts down a stored number.
export const TIMER_STATUS = ['not_started', 'ready', 'active', 'paused', 'expired', 'completed']
export const STATUS_LABEL = {
  not_started: 'Not started', ready: 'Ready', active: 'Active', paused: 'Paused', expired: 'Time expired', completed: 'Completed',
}
const ms = (t) => (t ? new Date(t).getTime() : null)

// timerState (from the data layer): { status, startedAt, deadlineAt, durationMs, pausedRemainingMs, finalRemainingMs, source }
// nowMs must already be corrected by the server clock offset.
export function computeTimer(s, nowMs) {
  if (!s) return null
  const deadline = ms(s.deadlineAt), start = ms(s.startedAt)
  const totalMs = s.durationMs ?? (deadline != null && start != null ? deadline - start : null)
  let status = s.status, remainingMs = null
  if (status === 'active') {
    remainingMs = deadline == null ? null : deadline - nowMs
    if (remainingMs != null && remainingMs <= 0) { status = 'expired'; remainingMs = 0 }
  } else if (status === 'paused') remainingMs = s.pausedRemainingMs ?? null
  else if (status === 'expired') remainingMs = 0
  else if (status === 'completed') remainingMs = s.finalRemainingMs ?? null
  else remainingMs = totalMs // not_started / ready
  return {
    status, remainingMs, totalMs, deadlineAt: s.deadlineAt ?? null, source: s.source ?? 'server',
    // True when only this device's clock says "expired". The server decides what that means for submissions.
    expiredOnClientOnly: status === 'expired' && s.status === 'active',
  }
}

export function formatClock(remainingMs) {
  if (remainingMs == null) return '--:--'
  const t = Math.max(0, Math.ceil(remainingMs / 1000))
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatDuration(totalMs) {
  if (totalMs == null) return null
  const t = Math.round(totalMs / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  return [h && `${h} h`, m && `${m} min`, !h && !m && `${s} s`, !h && m && s && `${s} s`].filter(Boolean).join(' ')
}

// Only thresholds that make sense for this duration (strictly shorter than the whole round).
export function applicableThresholds(totalMs, list) {
  return [...list].filter((t) => totalMs == null || t * 1000 < totalMs).sort((a, b) => b - a)
}
// Deepest threshold crossed, as an index into the descending list (0 = first warning), or -1.
export function warningLevel(remainingMs, thresholds) {
  if (remainingMs == null || remainingMs <= 0) return -1
  let lvl = -1
  thresholds.forEach((t, i) => { if (remainingMs <= t * 1000) lvl = i })
  return lvl
}
export function spokenRemaining(sec) {
  return sec >= 60 ? `${Math.round(sec / 60)} minute${sec >= 120 ? 's' : ''} remaining` : `${sec} seconds remaining`
}
