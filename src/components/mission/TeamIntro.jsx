import { useEffect, useState } from 'react'
import { StripLine } from '../HeroTitle'
import useReducedMotion from '../../hooks/useReducedMotion'

// One-time cinematic identification: the team name assembles from strips, holds briefly, then collapses so the
// dashboard settles into its compact working state. Non-blocking (the page beneath is usable) and ends on any input.
// Plays once per login session, after the briefing has closed. Never shown again on navigation.
export default function TeamIntro({ id, name, hold }) {
  const reduced = useReducedMotion()
  const key = `ras_team_intro:${id}`
  const [built, setBuilt] = useState(false)
  const [phase, setPhase] = useState(() => { try { return reduced || sessionStorage.getItem(key) === '1' ? 'gone' : 'wait' } catch { return 'gone' } })
  useEffect(() => { if (phase === 'wait' && !hold) setPhase('in') }, [phase, hold])
  useEffect(() => {
    if (phase === 'gone' || phase === 'wait') return
    try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }
    const t = []
    if (phase === 'in') { t.push(setTimeout(() => setBuilt(true), 1500)); t.push(setTimeout(() => setPhase('out'), 2300)) }
    if (phase === 'out') t.push(setTimeout(() => setPhase('gone'), 520))
    const skip = () => setPhase((p) => (p === 'in' ? 'out' : p))
    window.addEventListener('pointerdown', skip); window.addEventListener('keydown', skip)
    return () => { t.forEach(clearTimeout); window.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', skip) }
  }, [phase, key])
  if (phase === 'gone' || phase === 'wait') return null
  return (
    <div className={`tintro ${phase === 'out' ? 'is-out' : ''}`} aria-hidden="true">
      <p className="mono tintro__k">Identity confirmed</p>
      <div className={`tintro__name ${built ? '' : 'is-assembling'}`}><StripLine text={(name || 'Agent').toUpperCase()} assembling={!built} /></div>
    </div>
  )
}
