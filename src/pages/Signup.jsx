import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../components/ui'
import AuthTabs from '../components/AuthTabs'
import { useAuth, homeFor } from '../auth/AuthContext'
import { createTeam } from '../auth/authApi'
import { TEAM_REASONS } from '../auth/teamReasons'

// For the person creating the team. Teammates do not use this: they log in with the team code + their name.
export default function Signup() {
  const { status, role, signUp, refresh, backendConfigured } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState(null), [busy, setBusy] = useState(false), [sent, setSent] = useState(null)
  if (status === 'loading') return <Loading label="Checking session…" />
  if (status === 'authed' && !busy) return <Navigate to={homeFor(role)} replace />

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email')).trim(), password = String(f.get('password'))
    const teamName = String(f.get('team')).trim(), name = String(f.get('name')).trim()
    setBusy(true); setError(null)
    try {
      const r = await signUp({ name, email, password })
      if (r.needsConfirmation) { setSent(email); return }
      const t = await createTeam(teamName, '', name)
      if (!t.ok && t.reason !== 'already_in_team') {
        // The account exists and is signed in; finish the team step on the setup screen with the reason shown.
        nav('/team', { replace: true, state: { teamError: `Your account is ready, but: ${TEAM_REASONS[t.reason] || 'the team step failed.'}`, mode: 'create' } })
        return
      }
      await refresh()
      nav('/team', { replace: true })
    } catch (ex) { setError(ex.message || 'Could not create the account. Try again.') } finally { setBusy(false) }
  }

  if (sent) return (
    <div className="container block narrow">
      <p className="mono kicker">Almost there</p>
      <h1 className="h1">Check your email</h1>
      <Notice tone="ok" title="Confirmation sent">We sent a link to {sent}. Open it, then come back to finish creating your team.</Notice>
    </div>)

  return (
    <div className="container block narrow auth">
      <AuthTabs />
      <p className="mono kicker">New team</p>
      <h1 className="h1">Create account</h1>
      <p className="lede">Only one person per team does this. You get a 6-digit code on your dashboard to share, and your teammates log in with it.</p>
      {!backendConfigured && <Notice tone="warn" title="Backend not connected">Sign-up needs the Supabase keys in <code>.env.local</code>.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <form className="form" onSubmit={onSubmit}>
        <Field id="team" label="Team name">{(p) => <input {...p} name="team" minLength="2" maxLength="40" required autoComplete="off" />}</Field>
        <Field id="name" label="Your name">{(p) => <input {...p} name="name" maxLength="40" required autoComplete="name" />}</Field>
        <Field id="email" label="Email">{(p) => <input {...p} name="email" type="email" required autoComplete="email" />}</Field>
        <Field id="password" label="Password" hint="At least 8 characters.">{(p) => <input {...p} name="password" type="password" minLength="8" required autoComplete="new-password" />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Setting up…' : 'Create account and team'}</Button>
        <p className="muted small">Joining a team that already exists? <Link className="link" to="/login">Log in with the team code</Link></p>
      </form>
    </div>
  )
}
