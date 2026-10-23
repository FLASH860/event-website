import { useMemo, useState } from 'react'
import { N, opens, newPipes, pipeFlow, solveBoard, turnPipe } from './logic'

const SEG = { N: [50, 0], E: [100, 50], S: [50, 100], W: [0, 50] }
const PIPE_BASE = import.meta.env.BASE_URL
const SEED_KEY = 'ras-q2-seed-v3'

// Each browser keeps its own board: the seed is remembered, so a reload gives the same layout (turns are not saved).
export function q2Seed() {
  try {
    const old = Number(localStorage.getItem(SEED_KEY))
    if (Number.isInteger(old) && old > 0) return old
    const fresh = 1 + Math.floor(Math.random() * 4294967295)
    localStorage.setItem(SEED_KEY, String(fresh))
    return fresh
  } catch { return 1 + Math.floor(Math.random() * 4294967295) }
}

function Pipe({ tile }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {opens(tile).map((s) => <line key={s} x1="50" y1="50" x2={SEG[s][0]} y2={SEG[s][1]} />)}
      <circle cx="50" cy="50" r="9" />
    </svg>
  )
}

// Question 2: click a pipe to turn it a quarter turn. Connect POWER IN (top left) to the ROBOT (bottom right).
export default function PowerLine({ solved = false, seed: forced }) {   // `solved` and `seed` are only passed by the dev preview
  const [seed] = useState(() => forced ?? q2Seed())
  const [g, setG] = useState(() => { const b = newPipes(seed); return solved ? solveBoard(b) : b.g })
  const [turns, setTurns] = useState(0)
  const { seen, won } = useMemo(() => pipeFlow(g), [g])
  const turn = (r, c) => { if (won) return; setG((x) => turnPipe(x, r, c)); setTurns((t) => t + 1) }
  const cells = []
  for (let r = 0; r < N; r++) {
    cells.push(r === 0 ? <span key={`i${r}`} className="pz-end">POWER<br />IN ▶</span> : <span key={`i${r}`} />)
    for (let c = 0; c < N; c++) {
      cells.push(
        <button key={`${r}-${c}`} type="button" className={`pipe ${seen.has(r * N + c) ? 'is-live' : ''}`} disabled={won} onClick={() => turn(r, c)}
          aria-label={`Pipe, row ${r + 1} column ${c + 1}${seen.has(r * N + c) ? ', powered' : ''}`}><Pipe tile={g[r][c]} /></button>)
    }
    cells.push(r === N - 1 ? <span key={`o${r}`} className={`pz-end ${won ? 'is-live' : ''}`}>▶<br />ROBOT</span> : <span key={`o${r}`} />)
  }
  return (
    <section className="pz" aria-label="Power line puzzle">
      <p className="mono pz__kicker">ROBO-7 // POWER LINE</p>
      <div className={`pipes ${won ? 'pipes--won' : ''}`} style={{ '--n': N }}>{cells}</div>
      <p className="muted" role="status">Click a pipe to turn it a quarter turn. Pipes glow green when power reaches them. Turns: {turns} <span className="small">· Board #{seed % 100000}</span></p>
      {won && (
        <div className="pz__reveal">
          <p className="mono pz__kicker">Power restored. The panel displays:</p>
          <p className="pz__word">SERVO</p>
          <img src={`${PIPE_BASE}puzzles/q2-tag.png`} alt="Fault tag, part of the answer" width="260" />
        </div>)}
    </section>
  )
}
