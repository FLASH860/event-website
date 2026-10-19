import { useCallback, useEffect, useState } from 'react'
import { Placeholder, Status, Notice, Loading } from '../../components/ui'
import { ROUNDS, EVENT } from '../../config/eventConfig'
import { adminGetRounds, adminSaveRound, adminGetResults, adminSaveScore, adminSaveQualification, adminDecideQualification, adminPublishResults, adminListAnnouncements, adminSaveAnnouncement, adminRetractAnnouncement } from '../../lib/missionApi'
import { NotConnectedError } from '../../lib/supabase'
import { MOCK_DATA } from '../../lib/mock'

const Page = ({ kicker, title, ...rest }) => (<><p className="mono kicker">{kicker}</p><h1 className="h1">{title}</h1><Placeholder title={title} {...rest} /></>)
const Head = ({ kicker, title, children }) => (<><p className="mono kicker">{kicker}</p><h1 className="h1">{title}</h1>{children && <p className="lede">{children}</p>}{MOCK_DATA && <Notice tone="warn" title="Demo data">Stored in this browser by the dev mock. Not secure and not shared.</Notice>}</>)
const Offline = ({ err }) => err ? <Notice tone="warn" title={err instanceof NotConnectedError ? 'Backend not connected' : 'Could not load'}>{err instanceof NotConnectedError ? 'Nothing is shown because no real data exists yet.' : 'Please refresh.'}</Notice> : null
const MAX = Object.fromEntries(ROUNDS.map((r) => [r.n, r.points]))
const TIE_BREAKERS = { final_score: 'Final Mission score', total_time: 'Total time taken', short_puzzle: 'Additional short puzzle' }
const ROUND_STATUS = { not_started: 'Not started', active: 'Active', paused: 'Paused', closed: 'Closed' }

export const AdminHome = () => (
  <>
    <p className="mono kicker">Event head</p>
    <h1 className="h1">Overview</h1>
    <div className="panel">
      <Status tone="warn">Not yet connected</Status>
      <p>Live team counts and review queues appear here once the backend is connected. No numbers are shown because none are real yet.</p>
    </div>
  </>
)

export function Rounds() {
  const [cfg, setCfg] = useState(null), [err, setErr] = useState(null), [msg, setMsg] = useState(null)
  const load = useCallback(() => adminGetRounds().then((c) => { setCfg(c); setErr(null) }).catch((e) => { setErr(e); setCfg({}) }), [])
  useEffect(() => { load() }, [load])
  const save = async (e, n) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    try { await adminSaveRound(n, { status: f.get('status'), durationMin: f.get('duration') }); setMsg(`Round ${n} saved (audited).`); load() } catch { setMsg('Not saved. Duration must be a positive number of minutes.') }
  }
  return (
    <>
      <Head kicker="Rounds" title="Round configuration">The five official rounds. Names, order and maximum points are fixed here. You set only the status and a duration, and only once announced.</Head>
      <Offline err={err} />
      {msg && <Notice tone="info"><span role="status">{msg}</span></Notice>}
      {!cfg ? <Loading /> : <div className="tablewrap"><table className="table table--teams"><caption className="sr">Official rounds</caption>
        <thead><tr><th scope="col">#</th><th scope="col">Round</th><th scope="col">Max points</th><th scope="col">Status</th><th scope="col">Duration (min)</th><th scope="col"><span className="sr">Save</span></th></tr></thead>
        <tbody>{ROUNDS.map((r) => { const c = cfg[r.n] || {}; return (
          <tr key={`${r.n}-${c.status}-${c.durationMin}`}>
            <td className="mono">{r.n}</td><th scope="row">{r.name}</th><td className="mono">{r.points}</td>
            <td colSpan="3"><form className="row" style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }} onSubmit={(e) => save(e, r.n)}>
              <label className="sr" htmlFor={`st${r.n}`}>Status, round {r.n}</label>
              <select id={`st${r.n}`} name="status" defaultValue={c.status || 'not_started'}>{Object.entries(ROUND_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <label className="sr" htmlFor={`du${r.n}`}>Duration in minutes, round {r.n}</label>
              <input id={`du${r.n}`} name="duration" type="number" min="1" step="1" inputMode="numeric" placeholder="Not announced" defaultValue={c.durationMin ?? ''} />
              <button className="btn btn--ghost btn--sm" type="submit">Save</button></form></td>
          </tr>) })}</tbody></table></div>}
      <p className="muted">Total maximum: {EVENT.maxPoints} points. A status here is organiser bookkeeping; the authoritative per-team timers are started server-side.</p>
    </>
  )
}

export function Results() {
  const [data, setData] = useState(null), [err, setErr] = useState(null), [msg, setMsg] = useState(null)
  const load = useCallback(() => adminGetResults(MAX).then((d) => { setData(d); setErr(null) }).catch((e) => { setErr(e); setData(null) }), [])
  useEffect(() => { load() }, [load])
  const run = async (fn, ok) => { try { await fn(); setMsg(ok); load() } catch (e) { setMsg(e.message === 'out_of_range' ? 'Score is outside 0 to the round maximum. Nothing saved.' : 'That failed. Nothing was changed.') } }
  const q = data?.qualification
  const total = (s) => Object.values(s).reduce((a, b) => a + b, 0)
  const saveQ = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => adminSaveQualification({ criteria: f.get('criteria'), slots: f.get('slots'), cutoff: f.get('cutoff'), tieBreaker: f.get('tie') }), 'Criteria saved (audited).') }
  return (
    <>
      <Head kicker="Results" title="Scores & qualification">Enter scores and decide qualification yourself. Nothing is calculated into a decision: totals are a convenience, never an automatic cutoff.</Head>
      <Offline err={err} />
      {msg && <Notice tone="info"><span role="status">{msg}</span></Notice>}
      {q && <>
        <form className="panel" onSubmit={saveQ} key={JSON.stringify([q.criteria, q.slots, q.cutoff, q.tieBreaker])}>
          <h2 className="panel__title">Find Your Robo qualification</h2>
          {!(q.criteria || q.slots != null || q.cutoff != null) && <Status tone="warn">Criteria pending organiser confirmation</Status>}
          <label>Announced criteria (free text)<textarea name="criteria" rows="3" defaultValue={q.criteria} /></label>
          <label>Number of qualifying teams<input name="slots" type="number" min="1" defaultValue={q.slots ?? ''} placeholder="Not announced" /></label>
          <label>Cutoff score (reference only)<input name="cutoff" type="number" min="0" defaultValue={q.cutoff ?? ''} placeholder="Not announced" /></label>
          <label>Tie-breaker (possibilities from the rules; none is confirmed)<select name="tie" defaultValue={q.tieBreaker || ''}><option value="">Not chosen</option>{Object.entries(TIE_BREAKERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <div><button className="btn btn--ghost btn--sm" type="submit">Save criteria</button></div>
        </form>
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Scores and qualification by team</caption>
          <thead><tr><th scope="col">Team</th>{ROUNDS.map((r) => <th key={r.n} scope="col">R{r.n} <span className="muted">/{r.points}</span></th>)}<th scope="col">Total</th><th scope="col">Decision</th></tr></thead>
          <tbody>{data.teams.length === 0 && <tr><td colSpan="8" className="muted">No teams.</td></tr>}
            {data.teams.map((t) => (<tr key={t.teamCode}><th scope="row">{t.teamName}<br /><span className="mono muted">{t.teamCode}</span></th>
              {ROUNDS.map((r) => <td key={`${r.n}-${t.scores[r.n]}`}><label className="sr" htmlFor={`s${t.teamCode}${r.n}`}>{t.teamName} round {r.n} score</label>
                <input id={`s${t.teamCode}${r.n}`} type="number" min="0" max={r.points} step="any" style={{ width: '5rem' }} defaultValue={t.scores[r.n] ?? ''} placeholder="—"
                  onBlur={(e) => { if (e.target.value !== String(t.scores[r.n] ?? '')) run(() => adminSaveScore(t.teamCode, r.n, e.target.value, r.points), `Score saved for ${t.teamCode} round ${r.n} (audited).`) }} /></td>)}
              <td className="mono">{total(t.scores)}</td>
              <td><label className="sr" htmlFor={`d${t.teamCode}`}>Decision for {t.teamName}</label>
                <select id={`d${t.teamCode}`} value={q.decisions[t.teamCode] || 'pending'} onChange={(e) => { if (e.target.value === 'pending' || window.confirm(`Record "${e.target.value.replace('_', ' ')}" for ${t.teamName}?`)) run(() => adminDecideQualification(t.teamCode, e.target.value), 'Decision recorded (audited).') }}>
                  <option value="pending">Pending</option><option value="qualified">Qualified</option><option value="not_qualified">Not qualified</option></select></td></tr>))}</tbody></table></div>
        <div className="panel"><h2 className="panel__title">Visibility to teams</h2>
          <p>{q.published ? 'Teams can currently see their own scores and decision.' : 'Teams cannot see scores or decisions. Review them first, then publish.'}</p>
          <div><button className="btn btn--ghost btn--sm" type="button" onClick={() => { if (window.confirm(q.published ? 'Hide results from teams?' : 'Publish scores and decisions to teams?')) run(() => adminPublishResults(!q.published), q.published ? 'Results hidden.' : 'Results published (audited).') }}>{q.published ? 'Unpublish results' : 'Publish results…'}</button></div></div>
      </>}
    </>
  )
}

export function AdminAnnouncements() {
  const [rows, setRows] = useState(null), [err, setErr] = useState(null), [msg, setMsg] = useState(null)
  const load = useCallback(() => adminListAnnouncements().then((r) => { setRows(r); setErr(null) }).catch((e) => { setErr(e); setRows([]) }), [])
  useEffect(() => { load() }, [load])
  const post = async (e) => { e.preventDefault(); const form = e.currentTarget, f = new FormData(form)
    try { await adminSaveAnnouncement({ title: f.get('title'), body: f.get('body'), kind: f.get('kind') }); form.reset(); setMsg('Published to all teams (audited).'); load() } catch { setMsg('Title and message are both required.') } }
  return (
    <>
      <Head kicker="Updates" title="Announcements">Event-wide notices. Material changes to schedule or rules must reach every affected team.</Head>
      <Offline err={err} />
      {msg && <Notice tone="info"><span role="status">{msg}</span></Notice>}
      <form className="panel" onSubmit={post}>
        <label>Title<input name="title" maxLength="120" required /></label>
        <label>Message<textarea name="body" rows="4" maxLength="1000" required /></label>
        <label>Type<select name="kind"><option value="info">Information</option><option value="schedule">Schedule change</option><option value="safety">Safety notice</option></select></label>
        <div><button className="btn btn--primary" type="submit">Publish</button></div>
      </form>
      {!rows ? <Loading /> : rows.map((a) => <div className="panel" key={a.id}><Status tone={a.kind === 'safety' ? 'warn' : 'neutral'}>{a.kind}</Status><h2 className="panel__title">{a.title}</h2><p>{a.body}</p><p className="mono muted">{new Date(a.at).toLocaleString()}</p>
        <div><button className="btn btn--ghost btn--sm" type="button" onClick={async () => { await adminRetractAnnouncement(a.id); load() }}>Retract</button></div></div>)}
    </>
  )
}

export const Checkpoints = () => <Page kicker="QR" title="Checkpoint management"
  planned={['Generate and revoke opaque checkpoint tokens', 'Printable QR sheets', 'Scan log and replay restrictions']} />
export const AdminSubmissions = () => <Page kicker="Review" title="Submission review"
  planned={['Review queue', 'Accept, reject, request resubmission', 'Record scores and penalties']} />
