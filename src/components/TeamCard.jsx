import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { leaveTeam } from '../auth/authApi'
import { Button, Notice } from './ui'

// The team this player belongs to: name, ID, the 6-digit code teammates use to join, and who is in.
export default function TeamCard() {
  const { user, refresh } = useAuth()
  const t = user?.team
  const [copied, setCopied] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(null)
  if (!t) return null
  const copy = async () => { try { await navigator.clipboard.writeText(t.joinCode); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }
  const leave = async () => {
    if (!window.confirm(`Leave ${t.name}? You can join a team again with its code.${t.members.length === 1 ? ' You are the last member, so the team and its progress will be deleted.' : ''}`)) return
    setBusy(true); setErr(null)
    try { await leaveTeam(); await refresh() } catch { setErr('Could not leave the team. Try again.'); setBusy(false) }
  }
  return (
    <section className="panel teamcard" aria-label="Your team">
      <p className="mono kicker">Your team</p>
      <h2 className="panel__title">{t.name} <span className="mono muted">{t.code}</span></h2>
      <div className="teamcard__code">
        <div>
          <p className="mono muted">Join code · share with teammates</p>
          <p className="joincode" aria-label={`Join code ${t.joinCode.split('').join(' ')}`}>{t.joinCode}</p>
        </div>
        <Button type="button" variant="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy code'}</Button>
      </div>
      <p className="mono muted">Members {t.members.length} of {t.maxMembers}</p>
      <ul className="plain">{t.members.map((m, i) => <li key={i}>{m.name}{m.isYou && <span className="mono muted"> (you)</span>}</li>)}</ul>
      {err && <Notice tone="error">{err}</Notice>}
      <div><Button type="button" variant="ghost" size="sm" onClick={leave} disabled={busy}>Leave team…</Button></div>
    </section>
  )
}
