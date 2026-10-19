import { useMemo, useState } from 'react'
import { Loading } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, ago } from '../hooks'
import { Head, ErrorNote } from '../bits'

// Just who is here: every team, how many people, and their names.
export default function Teams() {
  const { data: rows, error } = usePoll(api.teams, 10000)
  const [q, setQ] = useState('')
  const shown = useMemo(() => (rows || []).filter((t) => !q || `${t.name} ${t.code} ${t.college} ${t.members.map((m) => m.name).join(' ')}`.toLowerCase().includes(q.toLowerCase())), [rows, q])
  const players = (rows || []).reduce((n, t) => n + t.members.length, 0)
  return (
    <>
      <Head kicker="Control" title="Teams" />
      <ErrorNote error={error} />
      {!rows ? <Loading label="Loading teams…" /> : (
        <>
          <div className="stats">
            <div className="stat"><span className="mono muted">Teams</span><span className="stat__n">{rows.length}</span></div>
            <div className="stat"><span className="mono muted">Players</span><span className="stat__n">{players}</span></div>
          </div>
          <div className="filters" role="search"><label>Search<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team, ID or member" /></label></div>
          <div className="tablewrap"><table className="table table--teams"><caption className="sr">Teams</caption>
            <thead><tr><th scope="col">ID</th><th scope="col">Team</th><th scope="col">Members</th><th scope="col">Joined</th></tr></thead>
            <tbody>{shown.length === 0 && <tr><td colSpan="4" className="muted">{rows.length ? 'No team matches.' : 'No teams yet.'}</td></tr>}
              {shown.map((t) => (
                <tr key={t.id}><td className="mono">{t.code}</td>
                  <th scope="row">{t.name}{t.college && <><br /><span className="muted small">{t.college}</span></>}</th>
                  <td><span className="mono">{t.members.length}/4</span> {t.members.map((m) => m.name).join(', ')}</td>
                  <td className="mono" title={new Date(t.createdAt).toLocaleString()}>{ago(t.createdAt)}</td></tr>))}</tbody></table></div>
        </>)}
    </>
  )
}
