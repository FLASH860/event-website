import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Loading } from '../../components/ui'
import { MISSION } from '../../config/mission'
import { useAuth } from '../../auth/AuthContext'
import QuestionPanel from '../../components/mission/QuestionPanel'
import MissionLog from '../../components/mission/MissionLog'
import TeamIntro from '../../components/mission/TeamIntro'
import TeamStrip from '../../components/TeamStrip'
import { startMyTimer } from '../../lib/missionApi'

// Mission screen: ONE composition. Header line (which stage) -> question (primary) beside the four-question log -> compact status.
// Official stage status, robot-component recovery and detailed scores live on the Overview page, not here.
export default function TeamDashboard() {
  const { user } = useAuth()
  const { mission, briefingActive } = useOutletContext()
  const [sel, setSel] = useState(null)
  const st = mission.state
  // The team's clock starts the first time anyone sees the first question (server ignores it once started or stopped).
  const open = !!st && !briefingActive
  useEffect(() => { if (open) startMyTimer().catch(() => {}) }, [open])
  useEffect(() => {
    if (!st || sel != null) return
    const want = Number(new URLSearchParams(window.location.search).get('q'))
    const ok = st.questions.find((x) => x.index === want && x.status !== 'locked')
    setSel(ok ? want : st.currentIndex ?? st.questions.filter((q) => q.status !== 'locked').pop()?.index ?? 1)
  }, [st, sel])


  return (
    <>
      <TeamIntro id={user?.id || user?.email} name={user?.team?.name} hold={briefingActive} />
      <TeamStrip />


      {!st && !mission.error && <Loading label="Loading your mission…" />}
      {mission.error === 'not_connected' && <div className="note"><p className="mono muted">Backend not connected</p><p>Add the Supabase keys to <code>.env.local</code> and restart the dev server.</p></div>}
      {mission.error === 'failed' && !st && <div className="note"><p className="mono muted">Could not load</p><p>Refresh to try again. If it keeps failing, tell a volunteer.</p></div>}

      {st && sel != null && (
        <section className="console" aria-label="Digital Transmission">
          <header className="console__head">
            <p className="mono console__stage"><span>Stage {sel} of {MISSION.questionCount}</span> Digital Transmission</p>
            <p className="mono muted console__count">{st.complete ? 'All 4 solved' : `${st.solvedCount} of ${MISSION.questionCount} solved`}</p>
          </header>
          <div className="console__q">
            <QuestionPanel state={st} setState={mission.setState} sel={sel} onProceed={setSel} />
          </div>
          <div className="console__log"><MissionLog questions={st.questions} current={st.currentIndex} selected={sel} onSelect={setSel} /></div>
        </section>
      )}

    </>
  )
}
