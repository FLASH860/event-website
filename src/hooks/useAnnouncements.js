import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAnnouncements } from '../lib/missionApi'

// Announcements for the team + a per-device "seen" marker for the unread dot (presentation only, not competition data).
export default function useAnnouncements(teamId) {
  const key = `ras_ann_seen:${teamId}`
  const [items, setItems] = useState(null)
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(key) || '' } catch { return '' } })
  const load = useCallback(() => listAnnouncements().then((r) => setItems(r)).catch(() => setItems((v) => v ?? [])), [])
  useEffect(() => {
    load()
    const id = setInterval(load, 45000)
    const vis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [load])
  const unread = useMemo(() => (items || []).filter((a) => a.at > seen), [items, seen])
  const markSeen = useCallback(() => {
    const latest = (items || []).reduce((m, a) => (a.at > m ? a.at : m), '')
    if (!latest || latest <= seen) return
    setSeen(latest); try { localStorage.setItem(key, latest) } catch { /* ignore */ }
  }, [items, seen, key])
  return { items, unread, markSeen, reload: load }
}
