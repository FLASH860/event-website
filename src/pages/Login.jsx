import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../components/ui'
import AuthTabs from '../components/AuthTabs'
import { useAuth, homeFor } from '../auth/AuthContext'
import { TEAM_REASONS } from '../auth/teamReasons'

// Teammates log in with just the team's 6-digit code and their own name. No email or password.
export default function Login() {
  const { status, role, loginWithCode, backendConfigured, notice, clearNotice } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (status === 'loading') return <Loading label="Checking session…" />
  if (status === 'authed' && !busy) return <Navigate to={homeFor(role)} replace />

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const code = String(f.get('code')).replace(/\s/g, ''), name = String(f.get('name')).trim()
    if (!/^\d{6}$/.test(code)) { setError('The team code is 6 digits.'); return }
    setBusy(true); setError(null); clearNotice()
    try {
      const r = await loginWithCode(code, name)
      if (r.ok || r.reason === 'already_in_team') nav('/team', { replace: true })
      else setError(TEAM_REASONS[r.reason] || 'Could not log in. Try again.')
    } catch (ex) { setError(ex.message || 'Could not log in. Try again.') } finally { setBusy(false) }
  }

  return (
    <div className="container block narrow auth">
      <AuthTabs />
      <p className="mono kicker">Team access</p>
      <h1 className="h1">Log in</h1>
      <p className="lede">Enter your team's 6-digit code and your name. The code is on the dashboard of whoever created the team.</p>

      {loc.state?.expired && <Notice tone="info" title="Please log in">Log in to continue.</Notice>}
      {notice && <Notice tone="warn" title="You were signed out">{notice}</Notice>}
      {!backendConfigured && <Notice tone="warn" title="Backend not connected">Login needs the Supabase keys in <code>.env.local</code>.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <form className="form" onSubmit={onSubmit}>
        <Field id="code" label="Team code">{(p) => <input {...p} name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength="7" autoComplete="off" required />}</Field>
        <Field id="name" label="Your name" hint="Use the same name each time so you come back as the same member.">{(p) => <input {...p} name="name" maxLength="40" required autoComplete="name" />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
      </form>
    </div>
  )
}
