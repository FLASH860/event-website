import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IMMERSION } from '../../config/immersion'
import useReducedMotion from '../../hooks/useReducedMotion'

const seenKey = (who, key) => `ras_briefing_seen:${who}:${key}`
export const hasPlayed = (who, key) => { try { return localStorage.getItem(seenKey(who, key)) === '1' } catch { return false } }
export const markPlayed = (who, key) => { try { localStorage.setItem(seenKey(who, key), '1') } catch { /* ignore */ } }
export const clearPlayed = (who, key) => { try { localStorage.removeItem(seenKey(who, key)) } catch { /* ignore */ } }

// Config + one-time + reduced-motion gate. Presentation only: it never touches challenge data.
export function shouldPlay(who, key, reduced) {
  const c = IMMERSION.selfDestruct
  if (!c.enabled || reduced || hasPlayed(who, key)) return false
  if (key === 'first-login') return c.onFirstLogin
  const m = /^round-(\d+)$/.exec(key)
  return Boolean(m && c.rounds.includes(Number(m[1])))
}

// Fixed-length transmission screen. The count is derived from elapsed time, not decremented state.
export default function SelfDestructBriefing({ onDone }) {
  const secs = IMMERSION.selfDestruct.seconds
  const start = useRef(Date.now())
  const [left, setLeft] = useState(secs)
  const skip = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.inert = true // keep keyboard and screen-reader focus on the transmission
    skip.current?.focus()
    return () => { if (root) root.inert = false }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, secs - Math.floor((Date.now() - start.current) / 1000))
      setLeft(l)
      if (Date.now() - start.current >= secs * 1000 + 500) { clearInterval(id); onDone() }
    }, 100)
    return () => clearInterval(id)
  }, [secs, onDone])

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onDone])

  return createPortal(
    <div className="sd" role="dialog" aria-modal="true" aria-label="Incoming transmission">
      <div className="sd__in">
        <p className="mono sd__label">Incoming transmission</p>
        <p className="sd__text" aria-label="This message will self-destruct in five seconds."><span aria-hidden="true">This message will</span> <span aria-hidden="true">self-destruct in</span> <span aria-hidden="true">five seconds.</span></p>
        <p className={`sd__count ${reduced ? '' : 'sd__count--anim'}`} aria-hidden="true" key={left}>{left}</p>
        <button ref={skip} type="button" className="btn btn--ghost" onClick={onDone}>Skip briefing</button>
        <p className="sd__fine">Nothing is deleted. Your briefing and challenge content stay available.</p>
      </div>
    </div>,
    document.body,
  )
}
