import { Link } from 'react-router-dom'
import { Status, Loading } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, ago, teamStatus } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'

const STATE_TEXT = { open: ['ok', 'Gameplay is OPEN'], locked: ['warn', 'Gameplay opens later'], closed: ['error', 'Gameplay is CLOSED'], disabled: ['warn', 'Gameplay is disabled'], unconfigured: ['warn', 'No window configured'] }

export default function Overview() {
  const stats = usePoll(api.stats, 10000)
  const teams = usePoll(api.teams, 10000)
  const feed = usePoll(() => api.attempts(12), 10000)
  const { run, node } = useFlash()
  const rows = teams.data
  const err = stats.error || teams.error || feed.error
  const by = (s) => (rows || []).filter((t) => teamStatus(t) === s).length
  const [tone, label] = STATE_TEXT[stats.data?.state] || ['neutral', '…']
  const solved = [1, 2, 3, 4].map((i) => (rows || []).filter((t) => t.questions[i - 1]?.solved).length)
  // Solved but the component is not recovered yet: these teams may be waiting for an organiser.
  const waiting = (rows || []).flatMap((t) => t.questions.filter((q) => q.solved && !q.recovered).map((q) => ({ t, q })))

  return (
    <>
      <Head kicker="Live" title="Overview">Refreshes every 10 seconds.</Head>
      <ErrorNote error={err} />
      {node}
      {!stats.data || !rows ? <Loading label="Loading…" /> : (
        <>
          <p><Status tone={tone}>{label}</Status> <Link className="link" to="/settings">Change window</Link></p>
          <div className="stats">
            <div className="stat"><span className="mono muted">Teams</span><span className="stat__n">{stats.data.teams}</span></div>
            <div className="stat"><span className="mono muted">Players</span><span className="stat__n">{stats.data.players}</span></div>
            <div className={`stat ${stats.data.playersWithoutTeam > 0 ? 'stat--warn' : ''}`}><span className="mono muted">Players without a team</span><span className="stat__n">{stats.data.playersWithoutTeam}</span></div>
            <div className="stat"><span className="mono muted">Not started</span><span className="stat__n">{by('not started')}</span></div>
            <div className="stat"><span className="mono muted">In progress</span><span className="stat__n">{by('in progress')}</span></div>
            <div className="stat"><span className="mono muted">Completed</span><span className="stat__n">{by('completed')}</span></div>
            <div className="stat"><span className="mono muted">Attempts, last hour</span><span className="stat__n">{stats.data.attemptsLastHour}</span></div>
          </div>

          <div className="cols cols--2">
            <section className="panel">
              <h2 className="panel__title">Teams that solved each question</h2>
              <div className="bars">{solved.map((n, i) => (
                <div className="bar" key={i}><span className="mono">Q{i + 1}</span>
                  <span className="bar__track"><span className="bar__fill" style={{ width: `${rows.length ? (n / rows.length) * 100 : 0}%` }} /></span>
                  <span className="mono">{n} / {rows.length}</span></div>))}</div>
            </section>

            <section className="panel">
              <h2 className="panel__title">Waiting on an organiser</h2>
              {waiting.length === 0 ? <p className="muted">No team is waiting on a component recovery.</p> : (
                <ul className="plain">{waiting.map(({ t, q }) => (
                  <li key={`${t.id}-${q.index}`} className="btn-row"><span><strong>{t.name}</strong> <span className="mono muted">{t.code}</span> · Q{q.index} solved, component not recovered</span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { await run(() => api.approveRecovery(t.id, q.index), `Recovery approved for ${t.code} Q${q.index}.`); teams.reload() }}>Approve recovery</button></li>))}</ul>)}
              <p className="muted small">In "Correct answer only" mode a recovery is optional, so this list can be ignored.</p>
            </section>
          </div>

          <section className="panel">
            <h2 className="panel__title">Latest attempts</h2>
            <div className="tablewrap"><table className="table table--teams"><caption className="sr">Latest attempts</caption>
              <thead><tr><th scope="col">When</th><th scope="col">Team</th><th scope="col">Q</th><th scope="col">Answer</th><th scope="col">Result</th></tr></thead>
              <tbody>{(feed.data || []).length === 0 && <tr><td colSpan="5" className="muted">No attempts yet.</td></tr>}
                {(feed.data || []).map((a) => (<tr key={a.id}><td className="mono">{ago(a.at)}</td><td>{a.teamName}</td><td>Q{a.questionIndex}</td><td>{a.answer}</td>
                  <td><Status tone={a.result === 'correct' ? 'ok' : 'neutral'}>{a.result}</Status></td></tr>))}</tbody></table></div>
            <p><Link className="link" to="/attempts">All attempts</Link></p>
          </section>
        </>)}
    </>
  )
}
