import { useEffect, useState } from 'react'
import { adminAudit } from '../../lib/missionApi'
import { NotConnectedError } from '../../lib/supabase'
import { MOCK_DATA } from '../../lib/mock'
import { Notice, Loading } from '../../components/ui'

export default function Audit() {
  const [rows, setRows] = useState(null), [err, setErr] = useState(null)
  useEffect(() => { adminAudit().then(setRows).catch((e) => { setErr(e); setRows([]) }) }, [])
  return (
    <>
      <p className="mono kicker">Audit</p>
      <h1 className="h1">Audit trail</h1>
      {MOCK_DATA && <Notice tone="warn" title="Demo data">Entries come from the dev mock.</Notice>}
      {err && <Notice tone="warn" title={err instanceof NotConnectedError ? 'Backend not connected' : 'Could not load'}>The audit trail needs the backend.</Notice>}
      {!rows ? <Loading label="Loading…" /> : (
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Audit trail</caption>
          <thead><tr><th scope="col">Time</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Detail</th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="4" className="muted">No entries yet.</td></tr>}
            {rows.map((r, i) => <tr key={i}><td className="mono">{new Date(r.at).toLocaleString()}</td><td>{r.actor}</td><td className="mono">{r.action}</td><td>{r.detail}</td></tr>)}</tbody></table></div>)}
    </>
  )
}
