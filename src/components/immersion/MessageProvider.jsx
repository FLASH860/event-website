import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { pickMessage } from '../../lib/messageEngine'

const Ctx = createContext({ show: () => {} })
export const useMissionMessage = () => useContext(Ctx)

// Shows at most one non-blocking message at a time. Narrative only: real status, errors, warnings and
// safety text must always be shown by their own components, never replaced by these lines.
export function MessageProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)
  const current = useRef(null)

  const dismiss = useCallback(() => { clearTimeout(timer.current); current.current = null; setMsg(null) }, [])

  const show = useCallback((trigger, opts = {}) => {
    const m = pickMessage(trigger, opts)
    if (!m) return null
    // A lower-priority message never replaces a higher-priority one that is on screen.
    if (current.current && (current.current.priority ?? 0) > (m.priority ?? 0)) return null
    clearTimeout(timer.current)
    const item = { ...m, heading: opts.heading, detail: opts.detail, variant: opts.variant || 'toast', key: Date.now() }
    current.current = item
    setMsg(item)
    timer.current = setTimeout(dismiss, m.durationMs ?? 4000)
    return m
  }, [dismiss])

  useEffect(() => () => clearTimeout(timer.current), [])
  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="msgdock" role="status" aria-live="polite">
        {msg && (
          <div key={msg.key} className={`msg msg--${msg.variant}`}>
            <div className="msg__body">
              {msg.heading && <p className="msg__heading">{msg.heading}</p>}
              <p className="msg__text">{msg.text}</p>
              {msg.detail && <p className="msg__detail">{msg.detail}</p>}
              {(msg.kind === 'film' || msg.kind === 'easter') && <p className="msg__note">Film reference · not an official IEEE RAS ECC statement</p>}
            </div>
            <button type="button" className="msg__x" onClick={dismiss} aria-label="Dismiss message">×</button>
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}
