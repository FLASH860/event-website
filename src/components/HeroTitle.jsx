import { useEffect, useState } from 'react'
import useReducedMotion from '../hooks/useReducedMotion'

// Cinematic title entrance. The browser draws the real headline glyphs; for the intro we stack copies of each line,
// each clipped to a narrow vertical strip, and slide alternate strips in from opposite sides until they align.
// Once assembled the strips are removed and the ordinary text remains. Plays once per tab session, never on
// route changes or re-renders, and is skipped entirely under prefers-reduced-motion.
const KEY = 'ras_title_intro'
const STRIPS = 9, TOTAL_MS = 1500
let playedThisLoad = false
const alreadyPlayed = () => { if (playedThisLoad) return true; try { return sessionStorage.getItem(KEY) === '1' } catch { return false } }

export function StripLine({ text, line = 0, assembling }) {
  return (
    <span className="tl" aria-hidden="true">
      <span className="tl__base">{text}</span>
      {assembling && Array.from({ length: STRIPS }, (_, i) => (
        <span key={i} className="tl__strip" style={{ '--i': i, '--n': STRIPS, '--dir': i % 2 === 0 ? -1 : 1, '--line': line }}>{text}</span>
      ))}
    </span>
  )
}

export function useTitleIntro() {
  const reduced = useReducedMotion()
  const [play] = useState(() => !reduced && !alreadyPlayed())
  const [assembling, setAssembling] = useState(play)
  useEffect(() => {
    playedThisLoad = true
    try { sessionStorage.setItem(KEY, '1') } catch { /* ignore */ }
    if (!play) return
    const t = setTimeout(() => setAssembling(false), TOTAL_MS)
    return () => clearTimeout(t)
  }, [play])
  return { play, assembling }
}

export default function HeroTitle({ assembling }) {
  return (
    <h1 className={`title ${assembling ? 'is-assembling' : ''}`}>
      <span className="title__sr">RAS: Mission Impossible</span>
      <span className="title__pre"><StripLine text="RAS:" line={0} assembling={assembling} /></span>
      <span className="title__main">
        <StripLine text="Mission" line={1} assembling={assembling} />
        <StripLine text="Impossible" line={2} assembling={assembling} />
      </span>
    </h1>
  )
}
