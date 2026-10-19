import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

// Always visible on the dashboard: the team's join code and who is in. Refreshes so new members appear without a reload.
export default function TeamStrip() {
  const { user, refresh } = useAuth()
  const t = user?.team
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 30000)
    return () => clearInterval(id)
  }, [refresh])
  if (!t) return null
  const copy = async () => { try { await navigator.clipboard.writeText(t.joinCode); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }
  return (
    <section className="teamstrip" aria-label="Your team">
      <div className="teamstrip__code">
        <span className="mono muted">Team code</span>
        <button type="button" className="joincode joincode--sm" onClick={copy} aria-label={`Team code ${t.joinCode.split('').join(' ')}. Press to copy.`}>{t.joinCode}</button>
        <span className="mono muted small" role="status">{copied ? 'Copied' : 'Tap to copy'}</span>
      </div>
      <div>
        <span className="mono muted">Team members {t.members.length}/{t.maxMembers}</span>
        <ul className="teamstrip__names">{t.members.map((m, i) => <li key={i}>{m.name}{m.isYou && <span className="muted"> (you)</span>}</li>)}</ul>
      </div>
    </section>
  )
}
