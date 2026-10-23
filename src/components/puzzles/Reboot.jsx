import { useEffect, useRef, useState } from 'react'
import { LET, newSequences, typedMatches } from './logic'

const PADS = [['RED', '#e5484d'], ['GREEN', '#30c46b'], ['BLUE', '#3e8bff'], ['YELLOW', '#f5c518']]
const WORD = 'TORQUE'
const PITCH = [330, 415, 262, 520]
const TAG = `${import.meta.env.BASE_URL}puzzles/q3-tag.png`

let audio = null
function beep(i) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)()
    const o = audio.createOscillator(), g = audio.createGain()
    o.frequency.value = PITCH[i]; o.connect(g); g.connect(audio.destination)
    g.gain.setValueAtTime(0.08, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35)
    o.start(); o.stop(audio.currentTime + 0.36)
  } catch { /* sound is optional */ }
}

// Question 3: watch the lights, repeat them (click the pads or type R G B Y). Six rounds of 5 to 10 flashes, each its own sequence.
// Every round cleared brings one letter of the word back.
export default function Reboot() {
  const [seqs] = useState(newSequences)
  const [round, setRound] = useState(0)             // rounds cleared (6 = all done)
  const [phase, setPhase] = useState('idle')        // idle | show | input | retry | won
  const [pos, setPos] = useState(0)
  const [lit, setLit] = useState(-1)
  const [msg, setMsg] = useState('')
  const [typed, setTyped] = useState('')
  const [sound, setSound] = useState(false)
  const soundRef = useRef(false)
  soundRef.current = sound
  const seq = seqs[Math.min(round, seqs.length - 1)]
  const play = (i) => { if (soundRef.current) beep(i) }

  useEffect(() => {
    if (phase !== 'show') return undefined
    const ids = []
    seq.forEach((p, k) => {
      ids.push(setTimeout(() => { setLit(p); play(p) }, 700 + k * 800))
      ids.push(setTimeout(() => setLit(-1), 700 + k * 800 + 450))
    })
    ids.push(setTimeout(() => { setPhase('input'); setPos(0); setTyped('') }, 700 + seq.length * 800))
    return () => { ids.forEach(clearTimeout); setLit(-1) }
  }, [phase, round]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'retry') return undefined
    const id = setTimeout(() => setPhase('show'), 900)
    return () => clearTimeout(id)
  }, [phase])

  const cleared = () => {
    setTyped('')
    if (round === seqs.length - 1) { setRound(seqs.length); setPhase('won') }
    else { setRound(round + 1); setPhase('idle'); setMsg('Round cleared. A letter came back online.') }
  }
  const wrong = () => { setTyped(''); setMsg(''); setPhase('retry') }
  const press = (i) => {
    if (phase !== 'input') return
    play(i)
    if (i !== seq[pos]) return wrong()
    if (pos + 1 === seq.length) cleared(); else setPos(pos + 1)
  }
  const submit = (e) => {
    e.preventDefault()
    if (phase !== 'input' || !typed.trim()) return
    if (typedMatches(typed, seq)) cleared(); else wrong()
  }
  const start = () => { setMsg(''); setPos(0); setPhase('show') }
  const ready = phase === 'input'

  return (
    <section className="pz pz--reboot" aria-label="Reboot sequence puzzle">
      <div className="pz-reboot__main">
        <p className="mono pz__kicker">ROBO-7 // REBOOT SEQUENCE</p>
        <div className="pz-letters" aria-label="Letters restored so far">
          {[...WORD].map((ch, i) => <span key={i} className={i < round ? 'is-got' : ''}>{i < round ? ch : '_'}</span>)}
        </div>
        <div className={`simon ${ready ? 'is-ready' : ''}`}>
          {PADS.map(([name, col], i) => (
            <button key={name} type="button" className={`spad ${lit === i ? 'is-lit' : ''}`} style={{ '--c': col }} disabled={!ready} onClick={() => press(i)} aria-label={`${name} pad`}>{name}</button>))}
        </div>
        <form className={`pz-type ${ready ? 'is-ready' : ''}`} onSubmit={submit}>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!ready} autoComplete="off" spellCheck="false" placeholder="Or type it: R G B Y" aria-label="Type the sequence using R, G, B and Y" />
          <button type="submit" className="btn btn--primary btn--sm" disabled={!ready}>Enter</button>
        </form>
        <p className="muted small">Typing: R = red, G = green, B = blue, Y = yellow. Type the whole sequence, then press Enter.</p>
        <p className="muted" role="status">
          {phase === 'won' ? 'All six rounds cleared.' : phase === 'show' ? 'Watch the lights...' : phase === 'retry' ? 'Not quite. Watch again.'
            : ready ? `Your turn: repeat the sequence (${pos} of ${seq.length}).` : msg || 'Press start when your team is ready.'}
        </p>
        {phase === 'idle' && <button type="button" className="btn btn--primary" onClick={start}>Start round {round + 1} of {seqs.length}</button>}
        {ready && <button type="button" className="btn btn--ghost" onClick={start}>Repeat the sequence</button>}
        <p className="muted small"><button type="button" className="linkbtn" onClick={() => setSound((s) => !s)}>Sound: {sound ? 'on' : 'off'}</button></p>
        {phase === 'won' && (
          <div className="pz__reveal">
            <p className="mono pz__kicker">Reboot complete. The robot was holding:</p>
            <p className="pz__word">{WORD}</p>
            <p className="muted">Add the AUTH TAG from the right.</p>
          </div>)}
      </div>
      <aside className="pz-reboot__tag"><img src={TAG} alt="Auth tag, part of the answer" width="260" /></aside>
    </section>
  )
}
