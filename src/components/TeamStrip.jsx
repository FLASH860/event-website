import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getMyTimer } from '../lib/missionApi'

const mmss = (ms) => {
  const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  const p = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}
const TIMER_WORD = { idle: 'Waiting to start', running: 'Running', stopped: 'Paused by organisers', finished: 'Time is up' }

// Always visible on the dashboard: the team's join code, who is in, and the team's clock when organisers have set one.
// Refreshes so new members and timer changes appear without a reload.
export default function TeamStrip() {
  const { user, refresh } = useAuth()
  const t = user?.team
  const [copied, setCopied] = useState(false)
  const [timer, setTimer] = useState(null), [at, setAt] = useState(0), [, setTick] = useState(0)

  useEffect(() => {
    const load = () => getMyTimer().then((x) => { setTimer(x); setAt(Date.now()) }).catch(() => {})
    load()
    const poll = setInterval(() => { if (document.visibilityState === 'visible') { load(); refresh() } }, 15000)
    const tick = setInterval(() => setTick((n) => n + 1), 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [refresh])

  if (!t) return null
  const copy = async () => { try { await navigator.clipboard.writeText(t.joinCode); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }
  const left = timer && timer.status !== 'none' ? (timer.status === 'running' ? Math.max(0, timer.remainingMs - (Date.now() - at)) : timer.remainingMs) : null
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
      {left != null && (
        <div className="teamstrip__timer">
          <span className="mono muted">Time left</span>
          <span className="joincode joincode--sm" aria-live="off">{mmss(left)}</span>
          <span className="mono muted small">{left === 0 ? TIMER_WORD.finished : TIMER_WORD[timer.status] || ''}</span>
        </div>)}
    </section>
  )
}
