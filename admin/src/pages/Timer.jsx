import { useState } from 'react'
import { Loading, Status } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, useTick, timeLeft, mmss } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'

const TONE = { running: 'ok', finished: 'warn', stopped: 'neutral', idle: 'neutral' }

// Add minutes to a team's clock (or every team's), then start and stop it. Teams see their own countdown on their dashboard.
export default function Timer() {
  const { data: rows, error, at, reload } = usePoll(api.teams, 4000)
  useTick()
  const { run, node } = useFlash()
  const [allMin, setAllMin] = useState('10')
  const [mins, setMins] = useState({}) // per team, while typing
  const act = async (fn, ok) => { await run(fn, ok); reload() }

  return (
    <>
      <Head kicker="Control" title="Timer">Add minutes, then start. Stop freezes the clock; start carries on from where it stopped. Adding time works any time, even while a clock is running. A negative number takes time off.</Head>
      <ErrorNote error={error} />
      {node}
      <section className="panel">
        <h2 className="panel__title">Every team</h2>
        <div className="btn-row">
          <label className="row">Minutes <input type="number" step="any" value={allMin} onChange={(e) => setAllMin(e.target.value)} style={{ width: '6rem' }} /></label>
          <button type="button" className="btn btn--ghost btn--sm" disabled={!allMin} onClick={() => act(() => api.addTime(null, Number(allMin)), `Added ${allMin} min to every team.`)}>Add to all</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => act(() => api.startTimer(null), 'Started every team that has time.')}>Start all</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => act(() => api.stopTimer(null), 'Stopped every running clock.')}>Stop all</button>
        </div>
      </section>

      {!rows ? <Loading /> : (
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Timers by team</caption>
          <thead><tr><th scope="col">Team</th><th scope="col">Status</th><th scope="col">Time left</th><th scope="col">Add minutes</th><th scope="col">Clock</th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="5" className="muted">No teams yet.</td></tr>}
            {rows.map((t) => {
              const none = t.timer.status === 'none', running = t.timer.status === 'running'
              const v = mins[t.id] ?? '5'
              return (
                <tr key={t.id}>
                  <th scope="row">{t.name} <span className="mono muted">{t.code}</span></th>
                  <td>{none ? <span className="muted">no time yet</span> : <Status tone={TONE[t.timer.status]}>{t.timer.status}</Status>}</td>
                  <td className="mono">{mmss(timeLeft(t.timer, at))}</td>
                  <td><div className="btn-row">
                    <label className="sr" htmlFor={`m${t.id}`}>Minutes to add for {t.name}</label>
                    <input id={`m${t.id}`} type="number" step="any" value={v} onChange={(e) => setMins((m) => ({ ...m, [t.id]: e.target.value }))} style={{ width: '5rem' }} />
                    <button type="button" className="btn btn--ghost btn--sm" disabled={!v} onClick={() => act(() => api.addTime(t.id, Number(v)), `Added ${v} min to ${t.code}.`)}>Add</button></div></td>
                  <td><div className="btn-row">
                    <button type="button" className="btn btn--primary btn--sm" disabled={none || running || t.timer.remainingMs <= 0} onClick={() => act(() => api.startTimer(t.id), `Started ${t.code}.`)}>Start</button>
                    <button type="button" className="btn btn--ghost btn--sm" disabled={!running} onClick={() => act(() => api.stopTimer(t.id), `Stopped ${t.code}.`)}>Stop</button></div></td>
                </tr>)
            })}</tbody></table></div>)}
    </>
  )
}
