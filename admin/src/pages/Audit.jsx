import { api } from '../api'
import { usePoll } from '../hooks'
import { Head, ErrorNote } from '../bits'
import { Loading } from '../../../src/components/ui'

export default function Audit() {
  const { data: rows, error } = usePoll(() => api.audit(500), 15000)
  return (
    <>
      <Head kicker="Audit" title="Audit trail">Every organiser action and team creation, newest first (last 500).</Head>
      <ErrorNote error={error} />
      {!rows ? <Loading label="Loading…" /> : (
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Audit trail</caption>
          <thead><tr><th scope="col">Time</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Detail</th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="4" className="muted">No entries yet.</td></tr>}
            {rows.map((r, i) => <tr key={i}><td className="mono">{new Date(r.at).toLocaleString()}</td><td>{r.actor}</td><td className="mono">{r.action}</td><td>{r.detail}</td></tr>)}</tbody></table></div>)}
    </>
  )
}
