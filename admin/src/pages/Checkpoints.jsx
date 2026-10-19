import { useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../api'
import { usePoll } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'
import { Loading } from '../../../src/components/ui'

// QR checkpoints. A token is shown ONCE, here, when generated: only its hash is stored, so it cannot be recovered later.
// Generating again replaces the old token (the old printed QR stops working). Keep this page open until you have printed.
export default function Checkpoints() {
  const { data: qs, error, reload } = usePoll(api.questions, 0)
  const { run, node } = useFlash()
  const [made, setMade] = useState({}) // { [index]: { token, url } }

  const generate = async (q) => {
    if (q.component.tokenSet && !window.confirm(`Q${q.index} already has a QR token. Generating a new one makes the OLD printed QR stop working. Continue?`)) return
    const token = await run(() => api.generateToken(q.index), `New token created for Q${q.index}. Print it now: it cannot be shown again.`)
    if (!token) return
    const url = await QRCode.toDataURL(token, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
    setMade((m) => ({ ...m, [q.index]: { token, url } }))
    reload()
  }
  const revoke = async (q) => {
    if (!window.confirm(`Revoke the QR token for Q${q.index}? Teams will no longer be able to scan it.`)) return
    await run(() => api.revokeToken(q.index), `Token for Q${q.index} revoked.`)
    setMade((m) => { const n = { ...m }; delete n[q.index]; return n })
    reload()
  }

  if (error) return (<><Head kicker="QR" title="Checkpoints" /><ErrorNote error={error} /></>)
  if (!qs) return <Loading />
  const printable = qs.filter((q) => made[q.index])

  return (
    <>
      <div className="noprint">
        <Head kicker="QR" title="Checkpoint codes">One QR code per component. Teams scan it with their phone to recover the component. The code under each QR also works if their camera fails.</Head>
        {node}
        <div className="tablewrap"><table className="table table--teams"><caption className="sr">Checkpoint tokens</caption>
          <thead><tr><th scope="col">Q</th><th scope="col">Component</th><th scope="col">Method</th><th scope="col">Token</th><th scope="col">Actions</th></tr></thead>
          <tbody>{qs.map((q) => (
            <tr key={q.index}><td className="mono">Q{q.index}</td><td>{q.component.code || <span className="muted">unnamed</span>}{q.component.locationNote && <><br /><span className="muted small">{q.component.locationNote}</span></>}</td>
              <td>{q.component.method === 'qr' ? 'QR scan' : 'Organiser confirms'}</td>
              <td>{q.component.tokenSet ? <span className="pill pill--ok">set</span> : <span className="pill">none</span>}</td>
              <td><div className="btn-row">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => generate(q)}>{q.component.tokenSet ? 'Generate new' : 'Generate QR'}</button>
                {q.component.tokenSet && <button type="button" className="btn btn--ghost btn--sm" onClick={() => revoke(q)}>Revoke</button>}
              </div></td></tr>))}</tbody></table></div>
        {printable.length > 0 && <p><button type="button" className="btn btn--primary" onClick={() => window.print()}>Print the {printable.length} code{printable.length === 1 ? '' : 's'} below</button></p>}
      </div>

      <div className="qrgrid">
        {printable.map((q) => (
          <figure className="qrcard" key={q.index}>
            <figcaption><strong>Q{q.index} · {q.component.code || 'Component'}</strong></figcaption>
            <img src={made[q.index].url} alt={`QR code for question ${q.index}`} />
            <code>{made[q.index].token}</code>
            <a className="noprint link" href={made[q.index].url} download={`ras-q${q.index}-qr.png`}>Download PNG</a>
          </figure>))}
      </div>
    </>
  )
}
