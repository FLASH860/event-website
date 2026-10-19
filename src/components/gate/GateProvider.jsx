import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { computeGate, gateCopy, formatCountdown } from '../../lib/gate'
import { fetchGameplayStatus } from '../../lib/gameplayApi'

const Ctx = createContext(null)
export const useGate = () => useContext(Ctx)

// Loads the gameplay window, corrects for the server clock when available, and exposes the derived gate state.
export function GateProvider({ children }) {
  const [cfg, setCfg] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [open, setOpen] = useState(false)
  const [demo, setDemo] = useState(null) // demonstration override of the displayed state only
  const offset = useRef(0)

  useEffect(() => {
    let dead = false
    const load = async () => {
      try {
        const s = await fetchGameplayStatus()
        if (dead) return
        offset.current = s.serverNow ? new Date(s.serverNow).getTime() - Date.now() : 0
        setCfg(s); setLoadError(false)
      } catch { if (!dead) setLoadError(true) }
    }
    load()
    const id = setInterval(load, 60000)
    return () => { dead = true; clearInterval(id) }
  }, [])

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])

  const real = useMemo(() => (cfg ? computeGate(cfg, now + offset.current) : { state: loadError ? 'unknown' : 'loading' }), [cfg, now, loadError])
  const gate = useMemo(() => {
    if (!demo || !cfg) return real
    if (demo === 'locked') return { state: 'locked', opensInMs: real.opensInMs > 0 ? real.opensInMs : 90061000 }
    return { state: demo }
  }, [demo, real, cfg])

  const value = useMemo(() => ({
    gate, cfg, loadError, isDemo: Boolean(demo), demo, setDemo,
    prototype: cfg?.source === 'prototype',
    openDialog: () => setOpen(true), closeDialog: () => setOpen(false),
  }), [gate, cfg, loadError, demo])

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && <GateDialog onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  )
}

function GateDialog({ onClose }) {
  const { gate, cfg, prototype, isDemo } = useGate()
  const ref = useRef(null)
  const copy = gateCopy(gate, cfg)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal() // native modal: focus trap, Esc to close, focus returns to the opener
  }, [])

  return (
    <dialog ref={ref} className={`gate gate--${copy.tone}`} aria-labelledby="gate-title" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="gate__in">
        {isDemo && <span className="tag tag--demo">Demonstration state</span>}
        <p className="mono gate__label">{gate.state === 'locked' ? 'Mission status · standing by' : 'Mission status'}</p>
        <h2 id="gate-title" className="gate__title">{copy.title}</h2>
        <p>{copy.body}</p>
        {gate.state === 'locked' && gate.opensInMs > 0 && (
          <p className="gate__count"><span className="mono">Opens in</span> <span role="timer" aria-live="off" className="gate__time">{formatCountdown(gate.opensInMs)}</span></p>
        )}
        {gate.state === 'locked' && cfg && !cfg.confirmed && <p className="muted small">This opening time is provisional. The organisers will confirm it.</p>}
        {prototype && <p className="muted small">Prototype note: this check uses your device’s clock. Real access is enforced by the server once the backend is connected.</p>}
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>Back to landing page</button>
          <Link className="btn btn--ghost" to="/rules" onClick={onClose}>Read the rules</Link>
        </div>
      </div>
    </dialog>
  )
}
