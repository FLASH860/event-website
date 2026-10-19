import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import jsQR from 'jsqr'
import ScanResult, { SCAN_OUTCOMES } from '../../components/immersion/ScanResult'
import { useMissionMessage } from '../../components/immersion/MessageProvider'
import { Button, Notice } from '../../components/ui'
import { verifyCheckpoint } from '../../lib/missionApi'
import { NotConnectedError } from '../../lib/supabase'

// A decoded QR code is only a REQUEST. Success is shown only after the server confirms the token for this team.
export default function Scan() {
  const { mission } = useOutletContext()
  const [cam, setCam] = useState('idle') // idle | starting | on | denied | unavailable
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const video = useRef(null), stream = useRef(null), canvas = useRef(null), raf = useRef(0)
  const last = useRef({ token: '', at: 0 }), inFlight = useRef(false)
  const { show } = useMissionMessage()

  const handleToken = useCallback(async (token) => {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true)
    try {
      const r = await verifyCheckpoint(token)
      const kind = SCAN_OUTCOMES[r.result] ? r.result : 'invalid'
      setResult({ kind, confirmed: kind === 'valid' })
      if (kind === 'valid') { show('checkpoint-verified', { confirmed: true, variant: 'milestone' }); mission.refresh() }
    } catch (e) {
      setResult({ kind: 'network_error', detail: e instanceof NotConnectedError ? 'The backend is not connected, so nothing was verified or unlocked.' : e.code === 'closed' ? 'The mission window is closed.' : undefined })
    } finally { inFlight.current = false; setBusy(false) }
  }, [show, mission])

  const stop = useCallback(() => { cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null }, [])
  useEffect(() => stop, [stop])

  // Decode frames ~6 times a second; the same code is not re-sent for 4 seconds.
  const tick = useCallback(() => {
    const v = video.current, c = canvas.current
    if (v && c && v.readyState >= 2 && v.videoWidth) {
      const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w)
      c.width = w; c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(v, 0, 0, w, h)
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
      const text = code?.data?.trim()
      if (text && !(text === last.current.token && Date.now() - last.current.at < 4000)) {
        last.current = { token: text, at: Date.now() }
        handleToken(text)
      }
    }
    raf.current = window.setTimeout(() => { raf.current = requestAnimationFrame(tick) }, 160)
  }, [handleToken])

  async function start() {
    setResult(null)
    if (!navigator.mediaDevices?.getUserMedia) { setCam('unavailable'); return }
    setCam('starting')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (video.current) { video.current.srcObject = stream.current; await video.current.play().catch(() => {}) }
      setCam('on')
      raf.current = requestAnimationFrame(tick)
    } catch (e) {
      setCam(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'unavailable')
    }
  }
  function off() { stop(); setCam('idle') }

  const onManual = (e) => {
    e.preventDefault()
    const t = String(new FormData(e.currentTarget).get('code') || '').trim()
    if (t) { setResult(null); handleToken(t) }
  }

  return (
    <>
      <p className="mono kicker">Checkpoints</p>
      <h1 className="h1">QR scanner</h1>
      <p className="lede">Point your camera at the checkpoint code. A scan only counts once the server verifies it for your team.</p>

      <div className="panel">
        <video ref={video} className={`cam ${cam === 'on' ? '' : 'hidden'}`} playsInline muted aria-label="Camera preview" />
        <canvas ref={canvas} className="hidden" aria-hidden="true" />
        {cam === 'on'
          ? <><Notice tone="info" title="Camera is on">{busy ? 'Checking the code with the server…' : 'Hold the QR code steady inside the frame.'}</Notice>
              <Button variant="ghost" type="button" onClick={off}>Turn camera off</Button></>
          : <Button type="button" onClick={start} disabled={cam === 'starting'}>{cam === 'starting' ? 'Starting camera…' : 'Start camera'}</Button>}
        {cam === 'denied' && <ScanResult kind="camera_denied" />}
        {cam === 'unavailable' && <ScanResult kind="camera_unavailable" />}
      </div>

      <form className="panel form" onSubmit={onManual}>
        <label htmlFor="manual">No camera? Type the code printed under the QR</label>
        <input id="manual" name="code" autoComplete="off" spellCheck="false" />
        <div><Button type="submit" variant="ghost" disabled={busy}>Verify code</Button></div>
      </form>

      {result && <ScanResult {...result} />}
    </>
  )
}
