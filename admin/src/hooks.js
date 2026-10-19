import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data now and again every `ms` (while the tab is visible). Keeps showing the last good data if a refresh fails.
// `at` is when the data arrived, so live timers can count on from it.
export function usePoll(fn, ms = 10000) {
  const [state, setState] = useState({ data: null, error: null, at: 0 })
  const ref = useRef(fn)
  ref.current = fn
  const load = useCallback(async () => {
    try { setState({ data: await ref.current(), error: null, at: Date.now() }) } catch (e) { setState((s) => ({ ...s, error: e.message })) }
  }, [])
  useEffect(() => {
    load()
    if (!ms) return
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, ms)
    return () => clearInterval(id)
  }, [load, ms])
  return { ...state, reload: load }
}

// Re-renders every second so countdowns tick.
export function useTick(ms = 1000) {
  const [n, setN] = useState(0)
  useEffect(() => { const id = setInterval(() => setN((x) => x + 1), ms); return () => clearInterval(id) }, [ms])
  return n
}

export const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Remaining time of a timer as shown right now: a running timer counts down from the moment its data arrived.
export const timeLeft = (timer, at) => {
  if (!timer || timer.status === 'none') return null
  const base = timer.remainingMs ?? 0
  return timer.status === 'running' ? Math.max(0, base - (Date.now() - at)) : base
}
export const mmss = (ms) => {
  if (ms == null) return '—'
  const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  const p = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}
