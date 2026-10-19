import { useOutletContext } from 'react-router-dom'
import { Loading } from '../../components/ui'
import TeamCard from '../../components/TeamCard'
import { MISSION } from '../../config/mission'

const Head = ({ kicker, title }) => (<><p className="mono kicker">{kicker}</p><h1 className="h1 h1--page">{title}</h1></>)

// Overview: your team and the four missions. Everything shown here comes from the server.
export function Overview() {
  const { mission } = useOutletContext()
  const st = mission.state
  return (<><Head kicker="Mission overview" title="Overview" />
    <TeamCard />
    <section className="ov"><h2 className="ov__t">Missions</h2>
      {!st ? <Loading /> : <ol className="ov__stages">{st.questions.map((q) => <li key={q.index}><span className="mono">{String(q.index).padStart(2, '0')}</span><span>{q.status === 'locked' ? `Mission ${q.index}` : q.title || `Mission ${q.index}`}</span>
        <span className="muted small">{q.status === 'solved' ? 'Solved' : q.status === 'locked' ? 'Locked' : 'Open'}</span></li>)}</ol>}
      <p className="muted small">{st ? `${st.solvedCount} of ${MISSION.questionCount} missions solved.` : ''}</p></section>
  </>)
}
export const Progress = Overview
