import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getMyTimer } from '../lib/missionApi'

const mmss = (ms) => {
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  const p = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}
const TIMER_WORD = { idle: 'Waiting to start', running: 'Running', stopped: 'Stopped by organisers' }

// Always visible on the dashboard: the team's join code, who is in, and the team's stopwatch (counting up) once organisers have started it.
// Refreshes so new members and timer changes appear without a reload.
export default function TeamStrip() {
  const { user, refresh } = useAuth()
  const t = user?.team
  const [copied, setCopied] = useState(false)
  const [timer, setTimer] = useState(null), [at, setAt] = useState(0), [, setTick] = useState(0)

  // The stopwatch is checked every 3 seconds (a tiny request) so Start / Stop from the organisers shows up almost at once; between checks
  // it keeps counting on its own. The team list refreshes less often. Checking also happens the moment the tab comes back into view.
  useEffect(() => {
    let busy = false
    const load = () => {
      if (busy) return
      busy = true
      getMyTimer().then((x) => { setTimer(x); setAt(Date.now()) }).catch(() => {}).finally(() => { busy = false })
    }
    const visible = () => document.visibilityState === 'visible'
    load()
    const timerPoll = setInterval(() => { if (visible()) load() }, 3000)
    const teamPoll = setInterval(() => { if (visible()) refresh() }, 15000)
    const tick = setInterval(() => setTick((n) => n + 1), 1000)
    const back = () => { if (visible()) { load(); refresh() } }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('focus', back)
    return () => { clearInterval(timerPoll); clearInterval(teamPoll); clearInterval(tick); document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back) }
  }, [refresh])

  if (!t) return null
  const copy = async () => { try { await navigator.clipboard.writeText(t.joinCode); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }
  const elapsed = timer && timer.status !== 'none' ? (timer.status === 'running' ? timer.elapsedMs + Math.max(0, Date.now() - at) : timer.elapsedMs) : null
  return (
    <section className="teamstrip" aria-label="Your team">
      <div className="teamstrip__code">
        <span className="mono muted">Team code</span>
        <button type="button" className="joincode joincode--sm" onClick={copy} aria-label={`Team code ${t.joinCode.split('').join(' ')}. Press to copy.`}>{t.joinCode}</button>
        <span className="mono muted small" role="status">{copied ? 'Copied' : 'Tap to copy'}</span>
      </div>
      <div>
        <span className="mono muted">Team members {t.members.length}/{t.maxMembers}</span>
        <ul className="teamstrip__names">{t.members.map((m, i) => <li key={i}>{m.name}{m.isYou && <span className="muted"> (you)</span>}</li>)}</ul>
      </div>
      {elapsed != null && (
        <div className="teamstrip__timer">
          <span className="mono muted">Time</span>
          <span className="joincode joincode--sm" aria-live="off">{mmss(elapsed)}</span>
          <span className="mono muted small">{TIMER_WORD[timer.status] || ''}</span>
        </div>)}
    </section>
  )
}
