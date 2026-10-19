import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data now and again every `ms` (while the tab is visible). Keeps showing the last good data if a refresh fails.
export function usePoll(fn, ms = 10000, deps = []) {
  const [data, setData] = useState(null), [error, setError] = useState(null)
  const ref = useRef(fn)
  ref.current = fn
  const load = useCallback(async () => {
    try { setData(await ref.current()); setError(null) } catch (e) { setError(e.message) }
  }, [])
  useEffect(() => {
    load()
    if (!ms) return
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, ms)
    return () => clearInterval(id)
  }, [load, ms, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, reload: load, setData }
}

export const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
export const teamStatus = (t) => (t.complete ? 'completed' : t.solvedCount > 0 || t.attempts > 0 ? 'in progress' : 'not started')
export const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '')
