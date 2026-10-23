import { useMemo } from 'react'
import { Loading, Status } from '../../../src/components/ui'
import { api } from '../api'
import { usePoll, useTick, elapsedNow, mmss } from '../hooks'
import { Head, ErrorNote } from '../bits'

const TONE = { running: 'ok', finished: 'warn', stopped: 'neutral', idle: 'neutral' }

// Most missions solved wins; ties go to whoever solved their latest mission first.
export default function Leaderboard() {
  const { data, error, at } = usePoll(api.teams, 5000)
  useTick()
  const rows = useMemo(() => [...(data || [])].sort((a, b) =>
    b.solvedCount - a.solvedCount
    || (a.lastSolvedAt ? new Date(a.lastSolvedAt).getTime() : Infinity) - (b.lastSolvedAt ? new Date(b.lastSolvedAt).getTime() : Infinity)
    || a.name.localeCompare(b.name)), [data])
  return (
    <>
      <Head kicker="Control" title="Leaderboard">Updates every 5 seconds. Ranked by missions solved, then by who finished their latest mission first.</Head>
      <ErrorNote error={error} />
      {!data ? <Loading /> : (
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Leaderboard</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Missions solved</th><th scope="col">Last solved</th><th scope="col">Time</th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="5" className="muted">No teams yet.</td></tr>}
            {rows.map((t, i) => (
              <tr key={t.id}><td className="mono">{i + 1}</td>
                <th scope="row">{t.name} <span className="mono muted">{t.code}</span></th>
                <td><span className="mono">{t.solvedCount}/4</span></td>
                <td className="mono">{t.lastSolvedAt ? new Date(t.lastSolvedAt).toLocaleTimeString() : '—'}</td>
                <td>{t.timer.status === 'none' ? <span className="muted">—</span> : <><Status tone={TONE[t.timer.status]}>{t.timer.status}</Status> <span className="mono">{mmss(elapsedNow(t.timer, at))}</span></>}</td></tr>))}</tbody></table></div>)}
    </>
  )
}
