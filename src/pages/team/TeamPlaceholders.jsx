import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Status, Notice, Loading } from '../../components/ui'
import { MOCK_DATA } from '../../lib/mock'
import { useState } from 'react'
import { ROUNDS } from '../../config/eventConfig'
import { MISSION } from '../../config/mission'
import { getMyProgress } from '../../lib/missionApi'

const Head = ({ kicker, title }) => (<><p className="mono kicker">{kicker}</p><h1 className="h1 h1--page">{title}</h1>{MOCK_DATA && <Notice tone="warn" title="Demo data">Comes from the dev mock in this browser.</Notice>}</>)

export function Announcements() {
  const { news } = useOutletContext()
  useEffect(() => { news.markSeen() }, [news.items]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = news.items
  return (<><Head kicker="Updates" title="Announcements" />
    {!rows ? <Loading /> : rows.length === 0 ? <p className="muted">No announcements yet.</p> :
      <ol className="annlist">{rows.map((a) => <li key={a.id}><p className="mono muted">{a.kind} · {new Date(a.at).toLocaleString()}</p><h2 className="annlist__t">{a.title}</h2><p>{a.body}</p></li>)}</ol>}</>)
}

// Overview keeps FOUR different things apart: the five official stages, the four Digital Transmission questions,
// the four robot components (Stage 3), and score/qualification. Anything without real data says so.
export function Overview() {
  const { mission } = useOutletContext()
  const [p, setP] = useState(null)
  useEffect(() => { getMyProgress().then(setP).catch(() => setP(null)) }, [])
  const st = mission.state
  const dec = p?.decision
  return (<><Head kicker="Mission overview" title="Overview" />
    <section className="ov"><h2 className="ov__t">Official stages</h2>
      <ol className="ov__stages">{ROUNDS.map((r) => <li key={r.id}><span className="mono">{String(r.n).padStart(2, '0')}</span><span>{r.name}</span><span className="muted small">{r.n === 1 && st ? `${st.solvedCount} of ${MISSION.questionCount} questions solved` : 'Status not published'}</span></li>)}</ol>
      <p className="muted small">Stage completion is shown only when the organisers record it. Solving questions does not by itself complete Stage 1 or qualify you for anything.</p></section>
    <section className="ov"><h2 className="ov__t">Stage 3 · Find Your Robo components</h2>
      <ul className="ov__parts">{['Head', 'Body / Core', 'Arms', 'Legs'].map((c) => <li key={c}><span>{c}</span><Status tone="neutral">Tracking not connected</Status></li>)}</ul>
      <p className="muted small">Component recovery is separate from the four questions. It will appear here once organisers connect it.</p></section>
    <section className="ov"><h2 className="ov__t">Score and qualification</h2>
      <dl className="ov__kv"><div><dt className="mono">Score</dt><dd>{p?.published && p.scores ? Object.entries(p.scores).map(([n, v]) => `Stage ${n}: ${v}`).join(' · ') || 'None recorded' : 'Not published'}</dd></div>
        <div><dt className="mono">Qualification</dt><dd>{dec === 'qualified' ? 'Qualified for the next stage' : dec === 'not_qualified' ? 'Not qualified for the next stage' : p?.criteriaConfigured ? 'No decision published yet' : 'Pending organiser confirmation'}</dd></div></dl>
      <p className="muted small">Only the top selected teams proceed after Find Your Robo, under criteria the organisers announce.</p></section></>)
}
export const Progress = Overview
