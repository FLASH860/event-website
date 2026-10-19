import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Status, Loading } from '../../components/ui'
import TeamCard from '../../components/TeamCard'
import { ROUNDS } from '../../config/eventConfig'
import { MISSION } from '../../config/mission'
import { getMyProgress } from '../../lib/missionApi'

const Head = ({ kicker, title }) => (<><p className="mono kicker">{kicker}</p><h1 className="h1 h1--page">{title}</h1></>)

export function Announcements() {
  const { news } = useOutletContext()
  useEffect(() => { news.markSeen() }, [news.items]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = news.items
  return (<><Head kicker="Updates" title="Announcements" />
    {!rows ? <Loading /> : rows.length === 0 ? <p className="muted">No announcements yet.</p> :
      <ol className="annlist">{rows.map((a) => <li key={a.id}><p className="mono muted">{a.kind} · {new Date(a.at).toLocaleString()}</p><h2 className="annlist__t">{a.title}</h2><p>{a.body}</p></li>)}</ol>}</>)
}

// Overview keeps FOUR different things apart: the five official stages, the four Digital Transmission questions,
// the four robot components, and score/qualification. Everything shown here comes from the server.
export function Overview() {
  const { mission } = useOutletContext()
  const [p, setP] = useState(null)
  useEffect(() => { getMyProgress().then(setP).catch(() => setP(null)) }, [])
  const st = mission.state
  const dec = p?.decision
  const scores = p?.published && p.scores ? p.scores : null
  return (<><Head kicker="Mission overview" title="Overview" />
    <TeamCard />
    <section className="ov"><h2 className="ov__t">Official stages</h2>
      <ol className="ov__stages">{ROUNDS.map((r) => <li key={r.id}><span className="mono">{String(r.n).padStart(2, '0')}</span><span>{r.name}</span>
        <span className="muted small">{r.n === 1 && st ? `${st.solvedCount} of ${MISSION.questionCount} questions solved` : scores?.[r.n] != null ? `${scores[r.n]} / ${r.points} points` : '—'}</span></li>)}</ol>
      <p className="muted small">Scores appear here once the organisers publish them. Solving questions does not by itself complete Stage 1 or qualify you for anything.</p></section>
    <section className="ov"><h2 className="ov__t">Robot components</h2>
      {!st ? <Loading /> : <ul className="ov__parts">{st.questions.map((q) => (
        <li key={q.index}><span>{q.status === 'locked' ? `Component ${q.index}` : (q.component.id || `Component ${q.index}`)}</span>
          {q.status === 'locked' ? <Status tone="neutral">Locked</Status>
            : q.component.status === 'recovered' ? <Status tone="ok">Recovered ({q.component.via === 'qr' ? 'QR verified' : 'organiser approved'})</Status>
            : <Status tone="warn">Not recovered</Status>}</li>))}</ul>}
      <p className="muted small">A component is recovered by scanning its checkpoint QR code, or when an organiser approves it.</p></section>
    <section className="ov"><h2 className="ov__t">Score and qualification</h2>
      <dl className="ov__kv"><div><dt className="mono">Score</dt><dd>{scores ? Object.entries(scores).map(([n, v]) => `Stage ${n}: ${v}`).join(' · ') || 'None recorded' : 'Not published'}</dd></div>
        <div><dt className="mono">Qualification</dt><dd>{dec === 'qualified' ? 'Qualified for the next stage' : dec === 'not_qualified' ? 'Not qualified for the next stage' : p?.criteriaConfigured ? 'No decision published yet' : 'Pending organiser confirmation'}</dd></div></dl>
      <p className="muted small">Only the top selected teams proceed after Find Your Robo, under criteria the organisers announce.</p></section></>)
}
export const Progress = Overview
