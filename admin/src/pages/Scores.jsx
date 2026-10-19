import { api } from '../api'
import { usePoll } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'
import { Loading, Status } from '../../../src/components/ui'
import { ROUNDS, EVENT } from '../../../src/config/eventConfig'

const TIE_BREAKERS = { final_score: 'Final Mission score', total_time: 'Total time taken', short_puzzle: 'Additional short puzzle' }

// Scores and qualification are entered by organisers. Nothing is calculated into a decision: totals are a convenience only.
export default function Scores() {
  const { data, error, reload } = usePoll(api.results, 0)
  const { run, node } = useFlash()
  const q = data?.qualification
  const total = (s) => Object.values(s).reduce((a, b) => a + Number(b), 0)
  const act = async (fn, ok) => { await run(fn, ok); reload() }
  const saveQ = (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    act(() => api.saveQualification({ criteria: f.get('criteria'), slots: f.get('slots'), cutoff: f.get('cutoff'), tieBreaker: f.get('tie') }), 'Criteria saved.')
  }
  return (
    <>
      <Head kicker="Results" title="Scores & qualification">Enter each round's score per team (the maximum is enforced by the server) and decide qualification yourself. Teams see nothing until you publish.</Head>
      <ErrorNote error={error} />
      {node}
      {!data ? <Loading /> : (
        <>
          <form className="panel" onSubmit={saveQ} key={JSON.stringify([q.criteria, q.slots, q.cutoff, q.tieBreaker])}>
            <h2 className="panel__title">Find Your Robo qualification</h2>
            {!(q.criteria || q.slots != null || q.cutoff != null) && <Status tone="warn">Criteria pending</Status>}
            <label>Announced criteria (free text)<textarea name="criteria" rows="3" defaultValue={q.criteria} /></label>
            <label>Number of qualifying teams<input name="slots" type="number" min="1" defaultValue={q.slots ?? ''} placeholder="Not announced" /></label>
            <label>Cutoff score (reference only)<input name="cutoff" type="number" min="0" defaultValue={q.cutoff ?? ''} placeholder="Not announced" /></label>
            <label>Tie-breaker<select name="tie" defaultValue={q.tieBreaker || ''}><option value="">Not chosen</option>{Object.entries(TIE_BREAKERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <div><button className="btn btn--ghost btn--sm" type="submit">Save criteria</button></div>
          </form>

          <div className="tablewrap"><table className="table table--teams"><caption className="sr">Scores and qualification by team</caption>
            <thead><tr><th scope="col">Team</th>{ROUNDS.map((r) => <th key={r.n} scope="col">R{r.n} <span className="muted">/{r.points}</span></th>)}<th scope="col">Total / {EVENT.maxPoints}</th><th scope="col">Decision</th></tr></thead>
            <tbody>{data.teams.length === 0 && <tr><td colSpan="8" className="muted">No teams yet.</td></tr>}
              {data.teams.map((t) => (<tr key={t.id}><th scope="row">{t.name}<br /><span className="mono muted">{t.code}</span></th>
                {ROUNDS.map((r) => (<td key={`${r.n}-${t.scores[r.n]}`}><label className="sr" htmlFor={`s${t.code}${r.n}`}>{t.name} round {r.n} score</label>
                  <input id={`s${t.code}${r.n}`} type="number" min="0" max={r.points} step="any" style={{ width: '5rem' }} defaultValue={t.scores[r.n] ?? ''} placeholder="—"
                    onBlur={(e) => { if (e.target.value !== String(t.scores[r.n] ?? '')) act(() => api.saveScore(t.id, r.n, e.target.value === '' ? null : Number(e.target.value)), `Saved ${t.code} round ${r.n}.`) }} /></td>))}
                <td className="mono">{total(t.scores)}</td>
                <td><label className="sr" htmlFor={`d${t.code}`}>Decision for {t.name}</label>
                  <select id={`d${t.code}`} value={t.decision} onChange={(e) => { if (e.target.value === 'pending' || window.confirm(`Record "${e.target.value.replace('_', ' ')}" for ${t.name}?`)) act(() => api.decide(t.id, e.target.value), 'Decision recorded.') }}>
                    <option value="pending">Pending</option><option value="qualified">Qualified</option><option value="not_qualified">Not qualified</option></select></td></tr>))}</tbody></table></div>

          <div className="panel"><h2 className="panel__title">Visibility to teams</h2>
            <p>{q.published ? 'Teams can currently see their own scores and decision.' : 'Teams cannot see scores or decisions. Review them first, then publish.'}</p>
            <div><button className="btn btn--ghost btn--sm" type="button" onClick={() => { if (window.confirm(q.published ? 'Hide results from teams?' : 'Publish scores and decisions to every team?')) act(() => api.publishResults(!q.published), q.published ? 'Results hidden.' : 'Results published.') }}>{q.published ? 'Unpublish results' : 'Publish results…'}</button></div></div>
        </>)}
    </>
  )
}
