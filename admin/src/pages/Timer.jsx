import { useEffect, useRef, useState } from 'react'
import { Loading, Status } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, useTick, elapsedNow, mmss } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'

const TONE = { running: 'ok', stopped: 'neutral', idle: 'neutral' }

// A stopwatch per team that counts UP from 0:00. Start and stop it, or log the time with a short note without stopping it.
// Teams see their own elapsed time on their dashboard.
export default function Timer() {
  const { data: rows, error, at, reload } = usePoll(api.teams, 4000)
  useTick()
  const { run, node } = useFlash()
  const [allNote, setAllNote] = useState('')
  const [notes, setNotes] = useState({}) // per team, while typing
  const [mins, setMins] = useState({}) // minutes to add or subtract, per team ('all' for every team)
  const [logsFor, setLogsFor] = useState(null) // the team whose logs are open in the pop-up
  const act = async (fn, ok) => { const r = await run(fn, ok); reload(); return r }
  const logOne = async (t) => {
    await act(() => api.logTime(t.id, notes[t.id] || ''), `Logged ${t.code} at ${mmss(elapsedNow(t.timer, at))}.`)
    setNotes((n) => ({ ...n, [t.id]: '' }))
  }
  const adjust = async (t) => {
    const key = t ? t.id : 'all', m = Number(mins[key])
    if (!m) return run(async () => { throw new Error('Type an amount first. A negative number takes time off.') })
    const label = `${m > 0 ? 'Added' : 'Subtracted'} ${Math.abs(m)} min ${t ? `for ${t.code}` : 'for every running or stopped team'}.`
    const r = await act(() => api.adjustTime(t ? t.id : null, Math.round(m * 60)), label)
    setMins((x) => ({ ...x, [key]: '' }))
    return r
  }
  const minBox = (id, t) => { const key = t ? t.id : 'all'; return (<>
    <label className="sr" htmlFor={id}>Time to add{t ? ` for ${t.name}` : ' for every team'}. A negative number takes time off.</label>
    <input id={id} type="number" step="any" inputMode="decimal" placeholder="e.g. 2 or -2" value={mins[key] ?? ''} onChange={(e) => setMins((x) => ({ ...x, [key]: e.target.value }))}
      onKeyDown={(e) => { if (e.key === 'Enter') adjust(t) }} style={{ width: '7rem' }} />
    <button type="button" className="btn btn--primary btn--sm" disabled={!Number(mins[key])} onClick={() => adjust(t)}>Add</button></>) }
  const open = logsFor && (rows || []).find((t) => t.id === logsFor)

  return (
    <>
      <Head kicker="Control" title="Timer">Each clock counts up from 0:00. Start begins it (or carries on after a stop), Stop freezes it. Log saves the time as it reads right now, with an optional note, and the clock keeps running. Type an amount and press Add (a negative number takes time off); a clock never goes below 0:00 and the change is logged. Reset puts it back to 0:00 and keeps the logs.</Head>
      <ErrorNote error={error} />
      {node}
      <section className="panel">
        <h2 className="panel__title">Every team</h2>
        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => act(() => api.startTimer(null), 'Started every team.')}>Start all</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => act(() => api.stopTimer(null), 'Stopped every running clock.')}>Stop all</button>
          <label className="sr" htmlFor="all-note">Note for every team</label>
          <input id="all-note" type="text" maxLength={200} placeholder="Note (optional)" value={allNote} onChange={(e) => setAllNote(e.target.value)} style={{ width: '14rem' }} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { await act(() => api.logTime(null, allNote), 'Logged every team.'); setAllNote('') }}>Log all</button>
          {minBox("all-min")}
        </div>
      </section>

      {!rows ? <Loading /> : (
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Stopwatches by team</caption>
          <thead><tr><th scope="col">Team</th><th scope="col">Status</th><th scope="col">Time</th><th scope="col">Clock</th><th scope="col">Add / subtract</th><th scope="col">Log the time</th><th scope="col">Logs</th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="7" className="muted">No teams yet.</td></tr>}
            {rows.map((t) => {
              const none = t.timer.status === 'none', running = t.timer.status === 'running'
              return (
                <tr key={t.id}>
                  <th scope="row">{t.name} <span className="mono muted">{t.code}</span></th>
                  <td>{none ? <span className="muted">not started</span> : <Status tone={TONE[t.timer.status]}>{t.timer.status}</Status>}</td>
                  <td className="mono">{none ? '00:00' : mmss(elapsedNow(t.timer, at))}</td>
                  <td><div className="btn-row">
                    <button type="button" className="btn btn--primary btn--sm" disabled={running} onClick={() => act(() => api.startTimer(t.id), `Started ${t.code}.`)}>Start</button>
                    <button type="button" className="btn btn--ghost btn--sm" disabled={!running} onClick={() => act(() => api.stopTimer(t.id), `Stopped ${t.code}.`)}>Stop</button>
                    <button type="button" className="btn btn--ghost btn--sm" disabled={none} onClick={() => { if (window.confirm(`Put ${t.name}'s clock back to 0:00?`)) act(() => api.resetTimer(t.id), `Reset ${t.code}.`) }}>Reset</button></div></td>
                  <td><div className="btn-row">{running || t.timer.status === 'stopped' ? minBox(`m${t.id}`, t) : <span className="muted">start it first</span>}</div></td>
                  <td><div className="btn-row">
                    <label className="sr" htmlFor={`n${t.id}`}>Note for {t.name}</label>
                    <input id={`n${t.id}`} type="text" maxLength={200} placeholder="Note (optional)" value={notes[t.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !none) logOne(t) }} style={{ width: '12rem' }} />
                    <button type="button" className="btn btn--ghost btn--sm" disabled={none} onClick={() => logOne(t)}>Log</button></div></td>
                  <td><button type="button" className="btn btn--ghost btn--sm" aria-haspopup="dialog" onClick={() => setLogsFor(t.id)}>Check logs</button></td>
                </tr>)
            })}</tbody></table></div>)}
      {open && <LogDialog team={open} onClose={() => setLogsFor(null)} />}
    </>
  )
}

// Every logged time for one team, newest first. Loads the full list when it opens (the table only polls the latest few).
function LogDialog({ team, onClose }) {
  const ref = useRef(null)
  const [logs, setLogs] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal() }, [])
  useEffect(() => {
    let live = true
    api.timeLog(team.id).then((l) => { if (live) setLogs(l) }).catch((e) => { if (live) { setErr(e.message); setLogs(team.timer.log || []) } }) // fall back to the latest few
    return () => { live = false }
  }, [team.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <dialog ref={ref} className="teamdialog" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current.close() }} aria-labelledby="logdialog-title">
      <h2 id="logdialog-title" className="teamdialog__title">Logs: {team.name}</h2>
      <p className="muted small">{team.code}{team.college && ` · ${team.college}`}</p>
      {err && <p className="muted small">Showing only the latest entries ({err}).</p>}
      {!logs ? <Loading label="Loading logs…" /> : logs.length === 0 ? <p className="muted">No logs yet.</p> : (
        <ul className="memberlist loglist">{logs.map((l, i) => (
          <li key={i}><span className="mono">{mmss(l.elapsedMs)}</span> {l.note || <span className="muted">no note</span>} <span className="mono muted small">{new Date(l.at).toLocaleTimeString()}</span></li>))}</ul>)}
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => ref.current.close()}>Close</button>
    </dialog>
  )
}
