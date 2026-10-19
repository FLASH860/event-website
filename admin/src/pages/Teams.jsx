import { Fragment, useMemo, useState } from 'react'
import { Status, Loading } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, ago, teamStatus } from '../hooks'
import { Head, ErrorNote, useFlash, STATUS_TONE } from '../bits'

export default function Teams() {
  const { data: rows, error, reload } = usePoll(api.teams, 10000)
  const { run, node } = useFlash()
  const [q, setQ] = useState(''), [status, setStatus] = useState(''), [open, setOpen] = useState(null)

  const shown = useMemo(() => (rows || []).filter((t) =>
    (!q || `${t.name} ${t.code} ${t.college} ${t.joinCode} ${t.members.map((m) => `${m.name} ${m.email}`).join(' ')}`.toLowerCase().includes(q.toLowerCase())) &&
    (!status || teamStatus(t) === status)), [rows, q, status])

  const act = async (fn, ok) => { await run(fn, ok); reload() }

  return (
    <>
      <Head kicker="Teams" title="Team monitor">Which team is at which question, who is in it, and what needs you. Refreshes every 10 seconds.</Head>
      <ErrorNote error={error} />
      {node}
      <div className="filters" role="search">
        <label>Search<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team, ID, join code, member, email" /></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any</option><option>not started</option><option>in progress</option><option>completed</option></select></label>
      </div>
      {!rows ? <Loading label="Loading teams…" /> : (
        <div className="tablewrap"><table className="table table--teams">
          <caption className="sr">Teams with progress</caption>
          <thead><tr><th scope="col">ID</th><th scope="col">Team</th><th scope="col">Members</th><th scope="col">Solved</th><th scope="col">Now on</th><th scope="col">Attempts</th><th scope="col">Last activity</th><th scope="col">Status</th><th scope="col"><span className="sr">Details</span></th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan="9" className="muted">No teams to show.</td></tr>}
            {shown.map((t) => {
              const st = teamStatus(t), isOpen = open === t.id
              return (
                <Fragment key={t.id}>
                  <tr className={isOpen ? 'is-open' : ''}>
                    <td className="mono">{t.code}</td><th scope="row">{t.name}{t.college && <><br /><span className="muted small">{t.college}</span></>}</th>
                    <td>{t.members.length}/4</td><td>{t.solvedCount}/4</td><td>{t.complete ? 'Done' : t.currentIndex ? `Q${t.currentIndex}` : 'Waiting'}</td>
                    <td>{t.attempts}</td><td className="mono">{ago(t.lastActivity)}</td><td><Status tone={STATUS_TONE[st]}>{st}</Status></td>
                    <td><button type="button" className="btn btn--ghost btn--sm" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)}>{isOpen ? 'Close' : 'Manage'}</button></td>
                  </tr>
                  {isOpen && (
                    <tr><td colSpan="9">
                      <div className="detail">
                        <p><span className="mono muted">Join code</span> <strong className="mono">{t.joinCode}</strong> · created {new Date(t.createdAt).toLocaleString()}</p>
                        <div className="tablewrap"><table className="table"><caption className="sr">Members</caption>
                          <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col"><span className="sr">Remove</span></th></tr></thead>
                          <tbody>{t.members.length === 0 && <tr><td colSpan="3" className="muted">No members.</td></tr>}
                            {t.members.map((m) => (<tr key={m.id}><td>{m.name || '—'}</td><td className="mono">{m.email}</td>
                              <td><button type="button" className="btn btn--ghost btn--sm" onClick={() => { if (window.confirm(`Remove ${m.email} from ${t.name}?`)) act(() => api.removeMember(m.id), `Removed ${m.email}.`) }}>Remove</button></td></tr>))}</tbody></table></div>
                        <div className="tablewrap"><table className="table"><caption className="sr">Questions</caption>
                          <thead><tr><th scope="col">Q</th><th scope="col">Unlocked</th><th scope="col">Solved</th><th scope="col">Attempts</th><th scope="col">Component</th><th scope="col">Hint</th><th scope="col">Actions</th></tr></thead>
                          <tbody>{t.questions.map((x) => (
                            <tr key={x.index}><td className="mono">Q{x.index}</td><td>{x.unlocked ? 'yes' : 'no'}</td><td>{x.solved ? 'yes' : 'no'}</td><td>{x.attempts}</td>
                              <td>{x.recovered ? `recovered (${x.via})` : 'not recovered'}</td><td>{x.hintReleased ? 'released' : '—'}</td>
                              <td><div className="btn-row">
                                {(!x.recovered || x.via !== 'organiser') && <button type="button" className="btn btn--ghost btn--sm" onClick={() => act(() => api.approveRecovery(t.id, x.index), `Recovery approved for ${t.code} Q${x.index}.`)}>Approve recovery</button>}
                                {!x.hintReleased && <button type="button" className="btn btn--ghost btn--sm" onClick={() => act(() => api.releaseHint(t.id, x.index), `Hint released for ${t.code} Q${x.index}.`)}>Release hint</button>}
                              </div></td></tr>))}</tbody></table></div>
                        <div className="btn-row">
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { if (window.confirm(`Reset ALL progress for ${t.name}? Their attempts, solves and recoveries are deleted. This cannot be undone.`)) act(() => api.resetTeam(t.id), `Progress reset for ${t.code}.`) }}>Reset progress…</button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { if (window.confirm(`DELETE team ${t.name} and all its data? Members stay as accounts but lose the team. This cannot be undone.`)) { setOpen(null); act(() => api.deleteTeam(t.id), `Deleted ${t.code}.`) } }}>Delete team…</button>
                        </div>
                      </div>
                    </td></tr>)}
                </Fragment>)
            })}
          </tbody></table></div>)}
    </>
  )
}
