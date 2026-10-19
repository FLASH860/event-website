import { useEffect, useRef, useState } from 'react'
import ScanResult, { SCAN_OUTCOMES } from '../../components/immersion/ScanResult'
import { useMissionMessage } from '../../components/immersion/MessageProvider'
import { Button, Notice } from '../../components/ui'
import { verifyCheckpoint } from '../../lib/checkpointApi'
import { NotConnectedError } from '../../lib/supabase'
import { DEMO_TOOLS } from '../../lib/demo'
import { MOCK_DATA } from '../../lib/mock'

export default function Scan() {
  const [cam, setCam] = useState('idle') // idle | starting | on | denied | unavailable
  const [result, setResult] = useState(null)
  const [token, setToken] = useState('')
  const video = useRef(null), stream = useRef(null)
  const { show } = useMissionMessage()

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null }
  useEffect(() => stop, [])

  async function start() {
    setResult(null)
    if (!navigator.mediaDevices?.getUserMedia) { setCam('unavailable'); return }
    setCam('starting')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (video.current) { video.current.srcObject = stream.current; await video.current.play().catch(() => {}) }
      setCam('on')
    } catch (e) {
      setCam(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'unavailable')
    }
  }
  function off() { stop(); setCam('idle') }

  // Integration path for the future decoder: a read token is only a REQUEST. Success shows only after the server says so.
  async function handleToken(token) {
    try {
      const r = await verifyCheckpoint(token)
      const kind = SCAN_OUTCOMES[r.result] ? r.result : 'invalid'
      setResult({ kind, confirmed: kind === 'valid', demo: MOCK_DATA })
      if (kind === 'valid') show('checkpoint-verified', { confirmed: true, demo: MOCK_DATA, variant: 'milestone' })
    } catch (e) {
      setResult({ kind: 'network_error', detail: e instanceof NotConnectedError ? 'The backend is not connected yet, so nothing was verified or unlocked.' : undefined })
    }
  }

  const demoShow = (kind) => {
    setResult({ kind, confirmed: kind === 'valid', demo: true })
    if (kind === 'valid') show('checkpoint-verified', { confirmed: true, demo: true, variant: 'milestone' })
  }

  return (
    <>
      <p className="mono kicker">Checkpoints</p>
      <h1 className="h1">QR scanner</h1>
      <p className="lede">Point your camera at the checkpoint code. A scan only counts once the server verifies it.</p>

      <div className="panel">
        <video ref={video} className={`cam ${cam === 'on' ? '' : 'hidden'}`} playsInline muted aria-label="Camera preview" />
        {cam === 'on'
          ? <><Notice tone="info" title="Camera is on">QR decoding and server verification are not enabled in this phase, so nothing will be scanned yet.</Notice>
              <Button variant="ghost" type="button" onClick={off}>Turn camera off</Button></>
          : <Button type="button" onClick={start} disabled={cam === 'starting'}>{cam === 'starting' ? 'Starting camera…' : 'Start camera'}</Button>}
        {cam === 'denied' && <ScanResult kind="camera_denied" />}
        {cam === 'unavailable' && <ScanResult kind="camera_unavailable" />}
      </div>

      {result && <ScanResult {...result} />}

      {DEMO_TOOLS && (
        <details className="demo">
          <summary>Demonstration tools</summary>
          {MOCK_DATA && (
            <form className="row" onSubmit={(e) => { e.preventDefault(); handleToken(token.trim()) }}>
              <label>Demo: submit a token as if scanned <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="DEMO-Q1" /></label>
              <Button type="submit" variant="ghost">Verify</Button>
            </form>)}
          <p className="muted small">Preview each outcome:</p>
          <p className="muted small">Simulated results for design review only. They are labelled and do not unlock anything.</p>
          <div className="row">
            {Object.keys(SCAN_OUTCOMES).filter((k) => !k.startsWith('camera')).map((k) => (
              <Button key={k} type="button" variant="ghost" onClick={() => demoShow(k)}>{k.replace(/_/g, ' ')}</Button>
            ))}
          </div>
        </details>
      )}
    </>
  )
}
