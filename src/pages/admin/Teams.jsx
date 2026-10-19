import { useCallback, useEffect, useMemo, useState } from 'react'
import { Notice, Status, Loading } from '../../components/ui'
import { adminListTeams, adminApproveRecovery, adminReleaseHint, adminResetTeam } from '../../lib/missionApi'
import { NotConnectedError } from '../../lib/supabase'
import { MOCK_DATA } from '../../lib/mock'
import { MISSION } from '../../config/mission'

// Labels only. The real set of states is decided by the backend workflow.
export const TEAM_STATUSES = ['not started', 'in progress', 'completed', 'qualified', 'eliminated', 'disqualified']

export default function Teams() {
  const [rows, setRows] = useState(null), [err, setErr] = useState(null), [msg, setMsg] = useState(null)
  const [q, setQ] = useState(''), [stage, setStage] = useState(''), [status, setStatus] = useState('')
  const load = useCallback(() => adminListTeams().then((r) => { setRows(r); setErr(null) }).catch((e) => { setErr(e); setRows([]) }), [])
  useEffect(() => { load() }, [load])

  const act = async (fn, label) => { try { await fn(); setMsg(`${label} (recorded in the audit trail).`); load() } catch { setMsg('That action failed. Nothing was changed.') } }
  const shown = useMemo(() => (rows || []).filter((r) =>
    (!q || `${r.teamName} ${r.teamCode}`.toLowerCase().includes(q.toLowerCase())) && (!stage || String(r.currentIndex) === stage) && (!status || r.status === status)), [rows, q, stage, status])

  return (
    <>
      <p className="mono kicker">Teams</p>
      <h1 className="h1">Team management</h1>
      <p className="lede">Which team is at which question, what they have completed, and what needs your action.</p>
      {MOCK_DATA && <Notice tone="warn" title="Demo data">Teams and progress come from the dev mock in this browser.</Notice>}
      {err && <Notice tone="warn" title={err instanceof NotConnectedError ? 'Backend not connected' : 'Could not load teams'}>{err instanceof NotConnectedError ? 'No team data is shown because none is real yet.' : 'Please refresh.'}</Notice>}
      {msg && <Notice tone="info"><span role="status">{msg}</span></Notice>}

      <div className="filters" role="search">
        <label>Search<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team or ID" /></label>
        <label>Current question<select value={stage} onChange={(e) => setStage(e.target.value)}><option value="">Any</option>{Array.from({ length: MISSION.questionCount }, (_, n) => <option key={n} value={n + 1}>Question {n + 1}</option>)}</select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any</option>{TEAM_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>

      {rows === null ? <Loading label="Loading teams…" /> : (
        <div className="tablewrap"><table className="table table--teams">
          <caption className="sr">Teams with progress</caption>
          <thead><tr><th scope="col">Team</th><th scope="col">Team ID</th><th scope="col">Current question</th><th scope="col">Solved</th><th scope="col">Official round</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan="7" className="muted">No teams to show.</td></tr>}
            {shown.map((r) => (
              <tr key={r.teamCode}>
                <th scope="row">{r.teamName}</th><td className="mono">{r.teamCode}</td>
                <td>{r.currentIndex ? `Question ${r.currentIndex}` : r.status === 'completed' ? 'Done' : 'Waiting'}</td><td>{r.solvedCount}/{MISSION.questionCount}</td>
                <td className="muted">Not configured</td><td><Status tone={r.status === 'completed' ? 'ok' : 'neutral'}>{r.status}</Status></td>
                <td>
                  <details className="manage"><summary>Manage</summary>
                    <ul className="plain">
                      {r.components.map((c) => (
                        <li key={c.index}><span className="mono">Q{c.index}</span> {c.solved ? 'solved' : 'open'} · {c.status === 'recovered' ? `recovered (${c.via})` : 'not recovered'}
                          <div className="row">
                            {c.status !== 'recovered' && <button type="button" className="btn btn--ghost btn--sm" onClick={() => act(() => adminApproveRecovery(r.teamCode, c.index), `Recovery approved for ${r.teamCode} Q${c.index}`)}>Approve recovery</button>}
                            {!c.hint && <button type="button" className="btn btn--ghost btn--sm" onClick={() => act(() => adminReleaseHint(r.teamCode, c.index), `Hint released for ${r.teamCode} Q${c.index}`)}>Release hint</button>}
                          </div></li>))}
                      <li><button type="button" className="btn btn--ghost btn--sm" onClick={() => { if (window.confirm(`Reset ALL progression for ${r.teamName}? This cannot be undone.`)) act(() => adminResetTeam(r.teamCode), `Progress reset for ${r.teamCode}`) }}>Reset progression…</button></li>
                    </ul></details></td>
              </tr>))}
          </tbody></table></div>)}
    </>
  )
}
