import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Loading } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, ago } from '../hooks'
import { Head, ErrorNote } from '../bits'

// Just who is here: every team, how many people, and their names.
export default function Teams() {
  const { data: rows, error } = usePoll(api.teams, 10000)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const shown = useMemo(() => (rows || []).filter((t) => !q || `${t.name} ${t.code} ${t.college} ${t.members.map((m) => m.name).join(' ')}`.toLowerCase().includes(q.toLowerCase())), [rows, q])
  const sel = (rows || []).find((t) => t.id === open)
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
            <thead><tr><th scope="col">ID</th><th scope="col">Team</th><th scope="col">Members</th><th scope="col">Solved</th><th scope="col">Joined</th></tr></thead>
            <tbody>{shown.length === 0 && <tr><td colSpan="5" className="muted">{rows.length ? 'No team matches.' : 'No teams yet.'}</td></tr>}
              {shown.map((t) => (
                <Fragment key={t.id}>
                  <tr className="row--click" onClick={() => setOpen(open === t.id ? null : t.id)} aria-haspopup="dialog">
                    <td className="mono">{t.code}</td>
                    <th scope="row"><button type="button" className="linklike" onClick={(e) => { e.stopPropagation(); setOpen(open === t.id ? null : t.id) }}>{t.name}</button>{t.college && <><br /><span className="muted small">{t.college}</span></>}</th>
                    <td><span className="mono">{t.members.length}/4</span> {t.members.map((m) => m.name).join(', ')}</td>
                    <td className="mono">{t.solvedCount}/4</td>
                    <td className="mono" title={new Date(t.createdAt).toLocaleString()}>{ago(t.createdAt)}</td></tr>
                </Fragment>))}</tbody></table></div>
          {sel && <TeamDialog team={sel} onClose={() => setOpen(null)} />}
        </>)}
    </>
  )
}

function TeamDialog({ team: t, onClose }) {
  const ref = useRef(null)
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal() }, [])
  return (
    <dialog ref={ref} className="teamdialog" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current.close() }} aria-labelledby="teamdialog-title">
      <h2 id="teamdialog-title" className="teamdialog__title">{t.name}</h2>
      <p className="muted small">{t.code}{t.college && ` · ${t.college}`}</p>
      <p><strong>{t.solvedCount} of 4</strong> questions completed by the team</p>
      <ul className="memberlist">{t.members.length === 0 && <li className="muted">No members.</li>}
        {t.members.map((m, i) => <li key={i}>{m.name}{m.solved != null && <> <span className="mono muted">— {m.solved} {m.solved === 1 ? 'question' : 'questions'} completed</span></>}</li>)}</ul>
      <button type="button" className="btn" onClick={() => ref.current.close()}>Close</button>
    </dialog>
  )
}
