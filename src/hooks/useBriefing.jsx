import { useCallback, useEffect, useState } from 'react'
import MissionBriefing from '../components/briefing/MissionBriefing'
import { getBriefingStatus, completeBriefing } from '../lib/missionApi'
import { useMissionMessage } from '../components/immersion/MessageProvider'

// Owns WHEN the briefing shows. Mounted once in the team layout so every team route (not only /team) is covered.
// 'checking' -> ask the server; 'briefing' -> first login, not completed; 'done'. Replay is separate and never persists anything.
export default function useBriefing({ teamId, teamName, settings }) {
  const { show } = useMissionMessage()
  const leftKey = `ras_briefing_left:${teamId}`
  const [phase, setPhase] = useState('checking')
  const [replay, setReplay] = useState(false)

  useEffect(() => {
    let dead = false
    getBriefingStatus()
      .then((r) => { if (dead) return; let left = false; try { left = sessionStorage.getItem(leftKey) === '1' } catch { /* ignore */ } setPhase(r.completed || left ? 'done' : 'briefing') })
      .catch(() => { if (!dead) setPhase('done') }) // cannot know / cannot record: never force it
    return () => { dead = true }
  }, [leftKey])

  // Completion is recorded ONLY by the final action. Leaving early records nothing (offered again at next login).
  const completeFirst = useCallback(async () => { await completeBriefing(); setPhase('done'); show('first-login') }, [show])
  const leaveFirst = useCallback(() => { try { sessionStorage.setItem(leftKey, '1') } catch { /* ignore */ } setPhase('done') }, [leftKey])
  const closeReplay = useCallback(() => setReplay(false), [])

  const overlay = (<>
    {phase === 'checking' && <div className="bf-cover" aria-hidden="true" />}
    {phase === 'briefing' && <MissionBriefing teamName={teamName} settings={settings} mode="first" onComplete={completeFirst} onExit={leaveFirst} />}
    {replay && <MissionBriefing teamName={teamName} settings={settings} mode="replay" onComplete={closeReplay} onExit={closeReplay} />}
  </>)
  return { overlay, startReplay: () => setReplay(true), active: phase !== 'done' || replay }
}
