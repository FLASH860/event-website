import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeTimer } from '../lib/timing'
import { fetchRoundTimer } from '../lib/timerApi'
import { isBackendConfigured } from '../lib/supabase'
import { RESYNC_MS } from '../config/timing'

// Server mode: state comes from the backend; the clock is corrected by (serverNow - deviceNow).
// Demo mode: state lives in sessionStorage, is labelled source:'demo', and is never trusted or shown as live.
const demoKey = (r) => `ras_demo_timer_${r}`
const readDemo = (r) => { try { return JSON.parse(sessionStorage.getItem(demoKey(r))) } catch { return null } }
const writeDemo = (r, v) => { try { v ? sessionStorage.setItem(demoKey(r), JSON.stringify(v)) : sessionStorage.removeItem(demoKey(r)) } catch { /* ignore */ } }

export default function useRoundTimer(roundId, { demo = false } = {}) {
  const [raw, setRaw] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | ok | unavailable | error
  const offset = useRef(0)
  const [now, setNow] = useState(() => Date.now())

  // ---- load ----
  useEffect(() => {
    setRaw(null)
    if (demo) { setRaw(readDemo(roundId) ?? { status: 'not_started', source: 'demo' }); setPhase('ok'); offset.current = 0; return }
    if (!isBackendConfigured) { setPhase('unavailable'); return }
    let dead = false
    const load = async () => {
      try {
        const t = await fetchRoundTimer(roundId)
        if (dead) return
        offset.current = t.serverNow ? new Date(t.serverNow).getTime() - Date.now() : 0
        setRaw(t); setPhase('ok')
      } catch { if (!dead) setPhase('error') }
    }
    setPhase('loading'); load()
    const id = setInterval(load, RESYNC_MS)
    const vis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', vis)
    return () => { dead = true; clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [roundId, demo])

  // ---- tick (display only; remaining time is always recomputed from the deadline) ----
  const ticking = raw?.status === 'active'
  useEffect(() => {
    if (!ticking) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [ticking])

  const view = useMemo(() => (raw ? computeTimer(raw, now + offset.current) : null), [raw, now])

  // ---- demo controls ----
  const setDemo = useCallback((v) => { writeDemo(roundId, v); setRaw(v ?? { status: 'not_started', source: 'demo' }); setNow(Date.now()) }, [roundId])
  const demoActions = useMemo(() => ({
    start: (minutes) => { const d = minutes * 60000, t = Date.now(); setDemo({ status: 'active', startedAt: new Date(t).toISOString(), deadlineAt: new Date(t + d).toISOString(), durationMs: d, source: 'demo' }) },
    pause: () => { const v = computeTimer(raw, Date.now()); if (v?.status === 'active') setDemo({ ...raw, status: 'paused', pausedRemainingMs: v.remainingMs }) },
    resume: () => { if (raw?.status === 'paused') setDemo({ ...raw, status: 'active', deadlineAt: new Date(Date.now() + raw.pausedRemainingMs).toISOString(), pausedRemainingMs: null }) },
    complete: () => { const v = computeTimer(raw, Date.now()); setDemo({ ...raw, status: 'completed', finalRemainingMs: v?.remainingMs ?? null }) },
    reset: () => setDemo(null),
  }), [raw, setDemo])

  return { view, phase, demoActions, source: raw?.source ?? (demo ? 'demo' : 'server') }
}
