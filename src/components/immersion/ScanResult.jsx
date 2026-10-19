// Distinct, plain-language outcomes for a checkpoint scan. Only `valid` is success, and only when the SERVER confirmed it.
export const SCAN_OUTCOMES = {
  valid: { tone: 'ok', title: 'Checkpoint verified.', body: 'The server confirmed this checkpoint for your team.', next: 'Next: follow your updated instructions.' },
  invalid: { tone: 'error', title: 'Invalid QR code.', body: 'This is not a mission checkpoint code.', next: 'Check you are scanning an official checkpoint and try again.' },
  already_processed: { tone: 'warn', title: 'Already scanned.', body: 'Your team has already completed this checkpoint.', next: 'No further action is needed here.' },
  wrong_stage: { tone: 'warn', title: 'Wrong checkpoint for this stage.', body: 'This checkpoint is not the one your team is currently on.', next: 'Re-read your current clue.' },
  not_authorised: { tone: 'error', title: 'Team not authorised.', body: 'Your team does not have access to this checkpoint.', next: 'Speak to a volunteer.' },
  camera_denied: { tone: 'error', title: 'Camera permission denied.', body: 'The browser blocked camera access, so scanning cannot start.', next: 'Allow the camera in your browser’s site settings, then retry. Ask a volunteer if you are stuck.' },
  camera_unavailable: { tone: 'error', title: 'Camera unavailable.', body: 'No usable camera was found, or another app is using it.', next: 'Close other apps using the camera, or ask a volunteer for help.' },
  network_error: { tone: 'error', title: 'Could not reach the server.', body: 'The scan could not be verified. Nothing was unlocked.', next: 'Check your connection and scan again.' },
}

export default function ScanResult({ kind, confirmed = false, demo = false, detail }) {
  const o = SCAN_OUTCOMES[kind]
  if (!o) return null
  // Guard: success must never render without server confirmation.
  if (kind === 'valid' && !confirmed) { console.warn('ScanResult: refusing to show success without server confirmation'); return null }
  return (
    <div className={`scanres scanres--${o.tone}`} role={o.tone === 'error' ? 'alert' : 'status'}>
      {demo && <span className="tag tag--demo">Demonstration — not a real scan</span>}
      <p className="scanres__title">{o.title}</p>
      <p>{detail || o.body}</p>
      <p className="muted">{o.next}</p>
    </div>
  )
}
