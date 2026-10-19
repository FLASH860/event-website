import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IMAGERY } from '../../config/imagery'
import { EVENT } from '../../config/eventConfig'
import { briefingSlides } from '../../config/briefing'
import { BriefingProgress, BriefingNavigation } from './BriefingParts'

const pad = (n) => String(n).padStart(2, '0')
const LOCK_MS = 380 // swallow rapid double-clicks so a slide is never skipped mid-transition

// Full-screen interactive briefing. Presentation only: it never starts a timer, unlocks a question or touches progress.
// mode 'first'  -> final action calls onComplete (the parent persists completion); leaving does NOT complete it.
// mode 'replay' -> same slides; the final action only calls onComplete as "return" (parent must not overwrite the record).
export default function MissionBriefing({ teamName, settings, mode = 'first', onComplete, onExit }) {
  const slides = useMemo(() => briefingSlides({ teamName, event: EVENT, settings }), [teamName, settings])
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const lock = useRef(0), head = useRef(null)
  const s = slides[i], total = slides.length

  useEffect(() => { // keep keyboard and screen-reader focus inside the briefing
    const root = document.getElementById('root')
    if (root) root.inert = true
    return () => { if (root) root.inert = false }
  }, [])
  useEffect(() => { head.current?.focus({ preventScroll: true }) }, [i])

  const go = useCallback((d) => {
    const now = Date.now(); if (now - lock.current < LOCK_MS) return
    lock.current = now; setI((v) => Math.min(total - 1, Math.max(0, v + d)))
  }, [total])

  const finish = useCallback(async () => {
    if (busy) return
    setBusy(true); setError(null)
    try { await onComplete() } catch { setError('Could not save your progress. Check your connection and try again.'); setBusy(false) }
  }, [busy, onComplete])

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [go, onExit])

  return createPortal(
    <div className="bf" role="dialog" aria-modal="true" aria-label="Mission briefing" data-mode={mode} data-img={IMAGERY.briefing && i === 0 ? '1' : undefined} style={IMAGERY.briefing ? { '--img': `url(${IMAGERY.briefing})` } : undefined}>
      <header className="bf__top">
        <p className="mono bf__label">{s.label}</p>
        <p className="mono bf__count" aria-hidden="true">{pad(i + 1)} / {pad(total)}</p>
        <button type="button" className="btn btn--ghost btn--sm bf__exit" onClick={onExit}>{mode === 'replay' ? 'Close' : 'Leave briefing'}</button>
      </header>

      <main className="bf__main">
        <section className="bf__slide" key={s.id} aria-labelledby="bf-h" aria-live="polite">
          <span className="bf__sweep" aria-hidden="true" />
          <p className="mono bf__kicker">{s.kicker}</p>
          <h2 id="bf-h" className="bf__h" ref={head} tabIndex={-1}>
            {s.lines.map((l, n) => <span key={n} className="bf__line" style={{ '--dir': n % 2 === 0 ? -1 : 1, '--n': n }}>{l}</span>)}
          </h2>
          {s.tagline && <p className="mono bf__tag">{s.tagline}</p>}
          <div className="bf__body">
            {s.body?.map((t) => <p key={t} className="bf__p">{t}</p>)}
            {s.points && <ul className="bf__list">{s.points.map((t) => <li key={t}>{t}</li>)}</ul>}
            {s.note && <p className="bf__note">{s.note}</p>}
            {s.facts && <dl className="bf__facts">{s.facts.map(([k, v]) => <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>)}</dl>}
            {s.link && <p><a className="link" href={s.link.href} target="_blank" rel="noopener noreferrer">{s.link.text} (opens in a new tab)</a></p>}
          </div>
        </section>
      </main>

      <footer className="bf__foot">
        <BriefingProgress index={i} total={total} />
        <BriefingNavigation index={i} total={total} onPrev={() => go(-1)} onNext={() => go(1)} onFinish={finish} busy={busy} error={error}
          finishLabel={mode === 'replay' ? 'Return to dashboard' : 'Accept mission — enter dashboard'} />
      </footer>
    </div>,
    document.body,
  )
}
