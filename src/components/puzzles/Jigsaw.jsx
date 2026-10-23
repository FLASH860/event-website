import { useState } from 'react'
import { Q1 } from './q1Tiles'
import { shuffled } from './logic'

const url = (name) => `${import.meta.env.BASE_URL}puzzles/q1/${name}`

// Question 1: the transmission arrives cut into shuffled pieces. Swap pieces (click one, then another, or drag) to rebuild the picture.
// The whole picture is never sent as one file, only the pieces.
export default function Jigsaw() {
  const [order, setOrder] = useState(() => shuffled(Q1.tiles.length))
  const [held, setHeld] = useState(null)
  const whole = order.every((v, i) => v === i)
  const swap = (a, b) => setOrder((o) => { const n = [...o]; [n[a], n[b]] = [n[b], n[a]]; return n })
  const pick = (i) => {
    if (whole) return
    if (held === null) setHeld(i)
    else { if (held !== i) swap(held, i); setHeld(null) }
  }
  const drop = (e, i) => {
    e.preventDefault()
    const from = Number(e.dataTransfer.getData('text/plain'))
    if (!whole && Number.isInteger(from) && from !== i) { swap(from, i); setHeld(null) }
  }
  return (
    <section className="pz" aria-label="Last transmission puzzle">
      <p className="mono pz__kicker">ROBO-7 // LAST TRANSMISSION</p>
      <div className={`jig ${whole ? 'jig--whole' : ''}`} style={{ gridTemplateColumns: `repeat(${Q1.cols}, 1fr)`, aspectRatio: `${Q1.cols * Q1.w} / ${Q1.rows * Q1.h}` }}>
        {order.map((t, i) => (
          <img key={i} src={url(Q1.tiles[t])} alt={whole ? '' : `Piece at position ${i + 1}`} className={held === i ? 'is-held' : ''}
            role={whole ? undefined : 'button'} tabIndex={whole ? undefined : 0} draggable={!whole}
            onClick={() => pick(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i) } }}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, i)} />
        ))}
      </div>
      <p className="muted" role="status">{whole ? 'Picture assembled. Read it to find your answer.' : 'Click a piece, then another piece, to swap them (or drag). Rebuild the picture.'}</p>
    </section>
  )
}
