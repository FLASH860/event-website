import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Button, Loading } from '../../components/ui'
import { MISSION } from '../../config/mission'
import { MOCK_DATA } from '../../lib/mock'
import { useAuth } from '../../auth/AuthContext'
import { DEMO_TOOLS } from '../../lib/demo'
import { getMyProgress } from '../../lib/missionApi'
import SelfDestructBriefing from '../../components/immersion/SelfDestructBriefing'
import { useMissionMessage } from '../../components/immersion/MessageProvider'
import QuestionPanel from '../../components/mission/QuestionPanel'
import MissionLog from '../../components/mission/MissionLog'
import TeamIntro from '../../components/mission/TeamIntro'

// Mission screen: ONE composition. Header line (which stage) -> question (primary) beside the four-question log -> compact status.
// Official stage status, robot-component recovery and detailed scores live on the Overview page, not here.
export default function TeamDashboard() {
  const { user } = useAuth()
  const { mission, news, briefingActive } = useOutletContext()
  const { show } = useMissionMessage()
  const [playing, setPlaying] = useState(false) // dev-only self-destruct demo
  const [sel, setSel] = useState(null)
  const [prog, setProg] = useState(null)
  const st = mission.state
  useEffect(() => { getMyProgress().then(setProg).catch(() => setProg(null)) }, [])
  useEffect(() => {
    if (!st || sel != null) return
    const want = Number(new URLSearchParams(window.location.search).get('q'))
    const ok = st.questions.find((x) => x.index === want && x.status !== 'locked')
    setSel(ok ? want : st.currentIndex ?? st.questions.filter((q) => q.status !== 'locked').pop()?.index ?? 1)
  }, [st, sel])

  const latest = news.unread[0]

  return (
    <>
      {playing && <SelfDestructBriefing onDone={() => setPlaying(false)} />}
      <TeamIntro id={user?.id || user?.email} name={user?.team?.name} hold={briefingActive} />

      {latest && (
        <p className="newsbar" role="status"><span className="newsbar__dot" aria-hidden="true" /><span className="mono">New announcement</span><strong>{latest.title}</strong><Link className="link" to="/team/announcements">Read</Link></p>
      )}

      {!st && !mission.error && <Loading label="Loading your mission…" />}
      {mission.error === 'not_connected' && <div className="note"><p className="mono muted">Backend not connected</p><p>Your questions appear here once the backend is connected. Nothing is faked.</p></div>}
      {mission.error === 'failed' && !st && <div className="note"><p className="mono muted">Could not load</p><p>Refresh to try again. If it keeps failing, tell a volunteer.</p></div>}

      {st && sel != null && (
        <section className="console" aria-label="Digital Transmission">
          <header className="console__head">
            <p className="mono console__stage"><span>Stage 1 of 5</span> Digital Transmission</p>
            <p className="mono muted console__count">{st.complete ? 'All 4 solved' : `${st.solvedCount} of ${MISSION.questionCount} solved`}{MOCK_DATA && <span className="tag tag--demo">Demo data</span>}</p>
          </header>
          <div className="console__q">
            <QuestionPanel state={st} setState={mission.setState} sel={sel} onProceed={setSel} />
          </div>
          <div className="console__log"><MissionLog questions={st.questions} current={st.currentIndex} selected={sel} onSelect={setSel} /></div>
          <footer className="console__foot">
            <p><span className="mono">Score</span> {prog?.published && prog.scores ? Object.values(prog.scores).reduce((a, b) => a + b, 0) : 'Not published'}</p>
            <p><span className="mono">Qualification</span> {prog?.decision === 'qualified' ? 'Qualified' : prog?.decision === 'not_qualified' ? 'Not qualified' : 'Pending organiser confirmation'}</p>
            <Link className="link" to="/team/overview">Mission overview</Link>
          </footer>
        </section>
      )}

      {DEMO_TOOLS && (
        <details className="demo">
          <summary>Demonstration: cinematic moments</summary>
          <p className="muted small">Everything here is simulated and labelled as a demonstration. No competition state changes.</p>
          <div className="row">
            <Button type="button" variant="ghost" onClick={() => setPlaying(true)}>Replay self-destruct sequence</Button>
            <Button type="button" variant="ghost" onClick={() => show('checkpoint-verified', { confirmed: true, demo: true, variant: 'milestone' })}>Checkpoint verified</Button>
            <Button type="button" variant="ghost" onClick={() => show('stage-unlock', { confirmed: true, demo: true, variant: 'milestone' })}>Access granted</Button>
            <Button type="button" variant="ghost" onClick={() => show('final-entry', { round: 5, confirmed: true, demo: true, variant: 'milestone' })}>Final mission entry</Button>
            <Button type="button" variant="ghost" onClick={() => show('completion', { confirmed: true, demo: true, variant: 'milestone' })}>Mission accomplished</Button>
            <Button type="button" variant="ghost" onClick={() => show('easter-egg', { demo: true, force: true })}>Easter egg</Button>
          </div>
        </details>
      )}
    </>
  )
}
