// Gameplay-window logic. PURE and presentation-grade: the real decision is made by the server
// (assert_gameplay_open in the database). A device clock is never the sole source of truth.
const ms = (t) => (t ? new Date(t).getTime() : null)

// g: { enabled, startsAt, endsAt, override }. nowMs must already be corrected by the server clock offset.
export function computeGate(g, nowMs) {
  if (!g) return { state: 'unknown' }
  if (!g.enabled) return { state: 'disabled' }
  const ov = g.override
  if (ov?.mode === 'closed') return { state: 'closed', via: 'override' }
  if (ov?.mode === 'open' && (!ov.until || nowMs < ms(ov.until))) return { state: 'open', via: 'override' }
  const start = ms(g.startsAt), end = ms(g.endsAt)
  if (start == null || end == null) return { state: 'unconfigured' }
  const effEnd = ov?.mode === 'extend' && ov.until ? Math.max(end, ms(ov.until)) : end
  if (nowMs < start) return { state: 'locked', opensInMs: start - nowMs }
  if (nowMs < effEnd) return { state: 'open', closesInMs: effEnd - nowMs, extended: effEnd > end }
  return { state: 'closed' }
}

export function formatInZone(iso, timeZone) {
  if (!iso) return null
  const s = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
  return `${s.replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM')} (${timeZone})`
}

export function formatCountdown(msLeft) {
  const t = Math.max(0, Math.floor(msLeft / 1000))
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  const p = (n) => String(n).padStart(2, '0')
  return `${d > 0 ? `${d}d ` : ''}${p(h)}:${p(m)}:${p(s)}`
}

// Copy for each gate state, shared by the dialog and the team-area guard.
export function gateCopy(gate, cfg) {
  const opens = formatInZone(cfg?.startsAt, cfg?.timeZone || 'Asia/Kolkata')
  switch (gate.state) {
    case 'locked': return { tone: 'warn', title: 'Oops! Your mission hasn’t started yet, Agent!', body: opens ? `The mission is not active yet. Gameplay opens on ${opens}.` : 'The mission is not active yet.' }
    case 'closed': return { tone: 'error', title: 'Mission window closed, Agent.', body: 'This challenge is no longer accepting new gameplay access. If you believe this is a mistake, speak to the organisers.' }
    case 'disabled': return { tone: 'warn', title: 'Gameplay is not enabled right now.', body: 'The organisers have not switched gameplay on. Check announcements or ask the organisers.' }
    case 'unconfigured': return { tone: 'warn', title: 'Gameplay window not announced yet.', body: 'The organisers have not published when the mission opens.' }
    default: return { tone: 'neutral', title: 'Checking the mission window…', body: 'One moment.' }
  }
}
