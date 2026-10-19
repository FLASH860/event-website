import { useEffect, useRef, useState } from 'react'
import { formatClock, formatDuration, STATUS_LABEL, applicableThresholds, warningLevel, spokenRemaining } from '../../lib/timing'
import { Status } from '../ui'

const TONE = { active: 'ok', paused: 'warn', expired: 'warn', completed: 'ok', ready: 'neutral', not_started: 'neutral' }

// Presentation only. `view` comes from computeTimer(); this component never decides whether time is up officially.
export default function ChallengeTimer({ round, view, warningsSec, startText, onWarning, label }) {
  const th = applicableThresholds(view?.totalMs ?? null, warningsSec)
  const lvl = view?.status === 'active' ? warningLevel(view.remainingMs, th) : -1
  const [said, setSaid] = useState('')
  const prev = useRef({ lvl: -1, status: null })

  // Announce only on state / threshold changes, never every second.
  useEffect(() => {
    if (!view) return
    const p = prev.current
    if (view.status !== p.status && p.status !== null) setSaid(`Timer ${STATUS_LABEL[view.status].toLowerCase()}`)
    else if (lvl !== p.lvl && lvl >= 0) setSaid(spokenRemaining(th[lvl]))
    if (p.status !== null && lvl > p.lvl && lvl >= 0) onWarning?.(th[lvl])
    prev.current = { lvl, status: view.status }
  }, [view?.status, lvl]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) return null
  const deadline = view.deadlineAt && ['active', 'paused'].includes(view.status)
    ? new Date(view.deadlineAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null
  const warn = lvl >= 0 ? (lvl === th.length - 1 && th.length > 1 ? 'late' : 'early') : ''

  return (
    <section className={`timer timer--${view.status} ${warn && `timer--warn-${warn}`}`} aria-label={`Timer, ${label || `round ${round.n}`}`}>
      <div className="timer__top">
        <span className="mono timer__round">{label || `Round ${round.n}`} · {round.name}</span>
        {view.source === 'demo' && <span className="tag tag--demo">Demo — not a competition timer</span>}
      </div>
      <div className="timer__main">
        <div className="timer__clock" role="timer" aria-live="off" key={lvl}>{formatClock(view.remainingMs)}</div>
        <div className="timer__side">
          <Status tone={TONE[view.status]}>{STATUS_LABEL[view.status]}</Status>
          <span className="timer__ctx mono">
            {view.totalMs != null && `of ${formatDuration(view.totalMs)}`}{deadline && ` · until ${deadline}`}
          </span>
        </div>
      </div>
      {warn && <p className="timer__warn">{spokenRemaining(th[lvl]).replace(/^./, (c) => c.toUpperCase())}.</p>}
      {view.status === 'not_started' && startText && <p className="timer__note">{startText}</p>}
      {view.status === 'expired' && <p className="timer__note">Time is up on your display. The server decides how submissions are treated under this round’s rules; nothing you submitted has been discarded.</p>}
      {view.status === 'paused' && <p className="timer__note">Paused by the organisers.</p>}
      <p className="timer__fine">The server’s clock is official. This display is a convenience and is not proof of an on-time submission.</p>
      <p className="sr" role="status" aria-live="polite">{said}</p>
    </section>
  )
}
