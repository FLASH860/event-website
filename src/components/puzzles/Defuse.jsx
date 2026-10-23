import { useEffect, useRef, useState } from 'react'
import { DF_CUT, DF_PRESS, DF_DIAL, DF_SW, SNAKE_SIZE, SNAKE_GOAL, snakeInit, snakeStep } from './logic'

const WIRES = [['RED', '#e5484d'], ['BLUE', '#3e8bff'], ['YELLOW', '#f5c518'], ['GREEN', '#30c46b'], ['WHITE', '#eeeeee']]
const KEYS = ['R', 'T', 'Q', 'O']
const CELL = 20
const TAG = `${import.meta.env.BASE_URL}puzzles/q4-tag.png`
const KEYMAP = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }

// The last lock: eat 10 power cells.
function Snake({ onWin }) {
  const canvas = useRef(null), game = useRef(snakeInit()), want = useRef(null), timer = useRef(null)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [msg, setMsg] = useState('')

  const draw = () => {
    const cv = canvas.current; if (!cv) return
    const x = cv.getContext('2d'), s = game.current
    x.fillStyle = '#0c0c0c'; x.fillRect(0, 0, SNAKE_SIZE * CELL, SNAKE_SIZE * CELL)
    x.fillStyle = '#e5ab2c'; x.beginPath(); x.arc(s.food[0] * CELL + CELL / 2, s.food[1] * CELL + CELL / 2, CELL / 2 - 3, 0, 7); x.fill()
    s.body.forEach((c, i) => { x.fillStyle = i === 0 ? '#a8e6bf' : '#6fbf8a'; x.fillRect(c[0] * CELL + 1, c[1] * CELL + 1, CELL - 2, CELL - 2) })
  }
  const stop = () => { clearInterval(timer.current); timer.current = null; setRunning(false) }
  useEffect(() => { draw(); return () => clearInterval(timer.current) }, [])

  const steer = (d) => { want.current = d }
  useEffect(() => {
    if (!running) return undefined
    const onKey = (e) => {
      const d = KEYMAP[e.key] || KEYMAP[String(e.key).toLowerCase()]
      if (!d) return
      e.preventDefault(); steer(d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running])

  const start = () => {
    if (timer.current) return
    game.current = snakeInit(); want.current = null; setScore(0); setMsg(''); draw(); setRunning(true)
    timer.current = setInterval(() => {
      const { s, event } = snakeStep(game.current, want.current)
      want.current = null
      if (event === 'crash') { stop(); game.current = snakeInit(); setScore(0); setMsg('Crashed. Score reset. Press Start.'); draw(); return }
      game.current = s; setScore(s.score); draw()
      if (event === 'win') { stop(); onWin() }
    }, 130)
  }

  return (
    <div className="snakebox">
      <p className="mono pz__kicker">All four disarmed. One last lock: eat {SNAKE_GOAL} power cells to release the cell.</p>
      <canvas ref={canvas} width={SNAKE_SIZE * CELL} height={SNAKE_SIZE * CELL} aria-label="Snake game board" />
      <p className="muted" role="status">Power cells: <b>{score}/{SNAKE_GOAL}</b> {msg}</p>
      <button type="button" className="btn btn--primary" onClick={start} disabled={running}>Start</button>
      <div className="dpad" aria-label="Steering">
        <button type="button" onClick={() => steer([0, -1])} aria-label="Up">▲</button>
        <div><button type="button" onClick={() => steer([-1, 0])} aria-label="Left">◀</button><button type="button" onClick={() => steer([0, 1])} aria-label="Down">▼</button><button type="button" onClick={() => steer([1, 0])} aria-label="Right">▶</button></div>
      </div>
      <p className="muted small">Arrow keys or WASD also work. Crashing into a wall or yourself resets the score.</p>
    </div>
  )
}

// Question 4: four modules (wires, keypad, dials, switches), one per team member. Every rule uses the words solved in Q1-Q3.
// Then a game of snake releases the final word.
export default function Defuse() {
  const [cut, setCut] = useState([])
  const [keys, setKeys] = useState([])
  const [dial, setDial] = useState([0, 0, 0])
  const [sw, setSw] = useState([0, 0, 0, 0, 0, 0])
  const [strikes, setStrikes] = useState(0)
  const [note, setNote] = useState('')
  const [won, setWon] = useState(false)

  const done = [cut.length === DF_CUT.length, keys.length === DF_PRESS.length, dial.every((v, i) => v === DF_DIAL[i]), sw.every((v, i) => v === DF_SW[i])]
  const armed = done.every(Boolean)
  const strike = (m) => { setStrikes((n) => n + 1); setNote(m) }
  const badge = (i) => <span className={`pz-badge ${done[i] ? 'is-ok' : ''}`}>{done[i] ? 'DISARMED' : 'ARMED'}</span>

  const cutWire = (w) => {
    if (w === DF_CUT[cut.length]) { setCut([...cut, w]); setNote('') } else { setCut([]); strike('wrong wire, the wires were restored') }
  }
  const press = (k) => {
    if (k === DF_PRESS[keys.length]) { setKeys([...keys, k]); setNote('') } else { setKeys([]); strike('wrong key, the keypad reset') }
  }
  const turn = (i, by) => setDial((d) => d.map((v, j) => (j === i ? (v + by + 10) % 10 : v)))
  const flip = (i) => setSw((s) => s.map((v, j) => (j === i ? v ^ 1 : v)))

  return (
    <section className="pz" aria-label="Energy cell lock puzzle">
      <p className="mono pz__kicker">ROBO-7 // ENERGY CELL LOCK</p>
      <p className="muted">Four modules. Split them up, one per person. Alarms triggered: {strikes}{note ? ` - ${note}` : ''}</p>
      <div className="mods">
        <section className="mod"><h3>Module 1: Wires {badge(0)}</h3>
          <p className="rule">Count the vowels (A E I O U) in the Q1 word. Cut that wire. Then cut the wire numbered one less than the number of letters in the Q2 word.</p>
          <div className="wires">{WIRES.map(([name, col], i) => (
            <button key={name} type="button" className={`wire5 ${cut.includes(i + 1) ? 'is-cut' : ''}`} style={{ '--c': col }} disabled={done[0]} onClick={() => cutWire(i + 1)} aria-label={`Wire ${i + 1}, ${name}`}><span>{i + 1}</span></button>))}</div></section>
        <section className="mod"><h3>Module 2: Keypad {badge(1)}</h3>
          <p className="rule">Press the four buttons in the order those letters first appear in the Q3 word.</p>
          <div className="keys">{KEYS.map((k) => <button key={k} type="button" className={`key ${keys.includes(k) ? 'is-hit' : ''}`} disabled={done[1]} onClick={() => press(k)}>{k}</button>)}</div></section>
        <section className="mod"><h3>Module 3: Dials {badge(2)}</h3>
          <p className="rule">Dial 1: the number of letters in the Q1 word. Dial 2: the position of the letter R in the Q2 word. Dial 3: the position of the letter Q in the Q3 word.</p>
          <div className="dials">{dial.map((v, i) => (
            <div className="dial" key={i}><button type="button" disabled={done[2]} onClick={() => turn(i, 1)} aria-label={`Dial ${i + 1} up`}>+</button><b>{v}</b><button type="button" disabled={done[2]} onClick={() => turn(i, -1)} aria-label={`Dial ${i + 1} down`}>-</button></div>))}</div></section>
        <section className="mod"><h3>Module 4: Switches {badge(3)}</h3>
          <p className="rule">Look at where the letter O sits in the Q1, Q2 and Q3 words. Flip ON the switches with those numbers. Every other switch stays OFF.</p>
          <div className="sws">{sw.map((v, i) => <button key={i} type="button" className={`sw ${v ? 'is-on' : ''}`} disabled={done[3]} onClick={() => flip(i)} aria-pressed={!!v}><i />{i + 1}</button>)}</div></section>
      </div>
      {armed && !won && <Snake onWin={() => setWon(true)} />}
      {won && (
        <div className="pz__reveal">
          <p className="mono pz__kicker">The cell releases the code word:</p>
          <p className="pz__word">RESCUE</p>
          <img src={TAG} alt="Arm key, part of the answer" width="260" />
        </div>)}
    </section>
  )
}
