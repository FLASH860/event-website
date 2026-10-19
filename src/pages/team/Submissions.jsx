import { useEffect, useState } from 'react'
import { listMySubmissions } from '../../lib/missionApi'
import { NotConnectedError } from '../../lib/supabase'
import { MOCK_DATA } from '../../lib/mock'
import { Notice, Loading, Status } from '../../components/ui'

export default function Submissions() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { listMySubmissions().then(setRows).catch((e) => setErr(e instanceof NotConnectedError ? 'nc' : 'fail')) }, [])
  return (
    <>
      <p className="mono kicker">History</p>
      <h1 className="h1">Submissions</h1>
      {MOCK_DATA && <Notice tone="warn" title="Demo data">Submissions come from the dev mock.</Notice>}
      {err === 'nc' && <Notice tone="warn" title="Backend not connected">Your submission history will appear here once the backend is connected.</Notice>}
      {err === 'fail' && <Notice tone="error" title="Could not load submissions">Please refresh.</Notice>}
      {!rows && !err && <Loading label="Loading submissions…" />}
      {rows && (
        <div className="tablewrap"><table className="table table--teams">
          <caption className="sr">Your submissions</caption>
          <thead><tr><th scope="col">Time</th><th scope="col">Question</th><th scope="col">Your answer</th><th scope="col">Result</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="4" className="muted">No submissions yet.</td></tr>}
            {rows.map((r, i) => (<tr key={i}><td className="mono">{new Date(r.submittedAt).toLocaleTimeString()}</td><td>Q{r.questionIndex}</td><td>{r.answer}</td>
              <td><Status tone={r.result === 'correct' ? 'ok' : 'neutral'}>{r.result === 'correct' ? 'Correct' : r.result === 'incorrect' ? 'Incorrect' : r.result}</Status></td></tr>))}
          </tbody></table></div>)}
    </>
  )
}
