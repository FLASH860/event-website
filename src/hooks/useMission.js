import { useCallback, useEffect, useState } from 'react'
import { getMissionState } from '../lib/missionApi'
import { NotConnectedError } from '../lib/supabase'

// Loads the team's mission state from the data layer and keeps it fresh (organisers may approve things at any time).
export default function useMission() {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const refresh = useCallback(async () => {
    try { setState(await getMissionState()); setError(null) }
    catch (e) { setError(e instanceof NotConnectedError ? 'not_connected' : 'failed') }
  }, [])
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 20000)
    const vis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [refresh])
  return { state, error, refresh, setState }
}
