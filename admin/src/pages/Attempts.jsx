import { useMemo, useState } from 'react'
import { Status, Loading } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, ago } from '../hooks'
import { Head, ErrorNote } from '../bits'

export default function Attempts() {
  const [live, setLive] = useState(true)
  const { data, error } = usePoll(() => api.attempts(300), live ? 5000 : 0, [live])
  const [q, setQ] = useState(''), [res, setRes] = useState('')
  const rows = useMemo(() => (data || []).filter((a) =>
    (!res || a.result === res) && (!q || `${a.teamName} ${a.teamCode} ${a.answer} ${a.by} Q${a.questionIndex}`.toLowerCase().includes(q.toLowerCase()))), [data, q, res])
  return (
    <>
      <Head kicker="Live" title="Answer attempts">Every answer any team submitted, newest first (last 300). Useful for spotting guessing or a question that nobody can solve.</Head>
      <ErrorNote error={error} />
      <div className="filters" role="search">
        <label>Search<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team, answer, person, Q2" /></label>
        <label>Result<select value={res} onChange={(e) => setRes(e.target.value)}><option value="">Any</option><option value="correct">correct</option><option value="incorrect">incorrect</option></select></label>
        <label className="check"><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Live (every 5 s)</label>
      </div>
      {!data ? <Loading /> : (
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Answer attempts</caption>
          <thead><tr><th scope="col">When</th><th scope="col">Team</th><th scope="col">Q</th><th scope="col">Answer</th><th scope="col">Submitted by</th><th scope="col">Result</th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="6" className="muted">Nothing to show.</td></tr>}
            {rows.map((a) => (<tr key={a.id}><td className="mono" title={new Date(a.at).toLocaleString()}>{ago(a.at)}</td><td>{a.teamName} <span className="mono muted">{a.teamCode}</span></td><td>Q{a.questionIndex}</td>
              <td>{a.answer}</td><td>{a.by}</td><td><Status tone={a.result === 'correct' ? 'ok' : 'neutral'}>{a.result}</Status></td></tr>))}</tbody></table></div>)}
    </>
  )
}
