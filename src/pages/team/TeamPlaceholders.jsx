import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Status, Loading } from '../../components/ui'
import TeamCard from '../../components/TeamCard'
import { MISSION } from '../../config/mission'
import { getMyProgress } from '../../lib/missionApi'

const Head = ({ kicker, title }) => (<><p className="mono kicker">{kicker}</p><h1 className="h1 h1--page">{title}</h1></>)

// Overview: the four missions, their robot components, and the published score. Everything shown here comes from the server.
export function Overview() {
  const { mission } = useOutletContext()
  const [p, setP] = useState(null)
  useEffect(() => { getMyProgress().then(setP).catch(() => setP(null)) }, [])
  const st = mission.state
  const dec = p?.decision
  const scores = p?.published && p.scores ? p.scores : null
  return (<><Head kicker="Mission overview" title="Overview" />
    <TeamCard />
    <section className="ov"><h2 className="ov__t">Missions</h2>
      {!st ? <Loading /> : <ol className="ov__stages">{st.questions.map((q) => <li key={q.index}><span className="mono">{String(q.index).padStart(2, '0')}</span><span>{q.status === 'locked' ? `Mission ${q.index}` : q.title || `Mission ${q.index}`}</span>
        <span className="muted small">{q.status === 'solved' ? 'Solved' : q.status === 'locked' ? 'Locked' : 'Open'}</span></li>)}</ol>}
      <p className="muted small">{st ? `${st.solvedCount} of ${MISSION.questionCount} missions solved.` : ''}</p></section>
    <section className="ov"><h2 className="ov__t">Robot components</h2>
      {!st ? <Loading /> : <ul className="ov__parts">{st.questions.map((q) => (
        <li key={q.index}><span>{q.status === 'locked' ? `Component ${q.index}` : (q.component.id || `Component ${q.index}`)}</span>
          {q.status === 'locked' ? <Status tone="neutral">Locked</Status>
            : q.component.status === 'recovered' ? <Status tone="ok">Recovered ({q.component.via === 'qr' ? 'QR verified' : 'organiser approved'})</Status>
            : <Status tone="warn">Not recovered</Status>}</li>))}</ul>}
      <p className="muted small">A component is recovered by scanning its checkpoint QR code, or when an organiser approves it.</p></section>
    <section className="ov"><h2 className="ov__t">Score and qualification</h2>
      <dl className="ov__kv"><div><dt className="mono">Score</dt><dd>{scores ? (Object.values(scores).reduce((a, b) => a + Number(b), 0) || 'None recorded') : 'Not published'}</dd></div>
        <div><dt className="mono">Qualification</dt><dd>{dec === 'qualified' ? 'Qualified for the next stage' : dec === 'not_qualified' ? 'Not qualified for the next stage' : p?.criteriaConfigured ? 'No decision published yet' : 'Pending organiser confirmation'}</dd></div></dl>
    </section></>)
}
export const Progress = Overview
