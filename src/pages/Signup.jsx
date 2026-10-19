import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../components/ui'
import { useAuth, homeFor } from '../auth/AuthContext'
import AuthTabs from '../components/AuthTabs'

// Each player makes their own account, then creates a team or joins one with a 6-digit code.
export default function Signup() {
  const { status, role, signUp, backendConfigured } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState(null), [busy, setBusy] = useState(false), [sent, setSent] = useState(null)
  if (status === 'loading') return <Loading label="Checking session…" />
  if (status === 'authed') return <Navigate to={homeFor(role)} replace />

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget), password = String(f.get('password'))
    if (password !== String(f.get('confirm'))) { setError('The two passwords do not match.'); return }
    setBusy(true); setError(null)
    try {
      const email = String(f.get('email')).trim()
      const r = await signUp({ name: String(f.get('name')).trim(), email, password })
      if (r.needsConfirmation) setSent(email); else nav('/team', { replace: true })
    } catch (ex) { setError(ex.message) } finally { setBusy(false) }
  }

  if (sent) return (
    <div className="container block narrow">
      <p className="mono kicker">Almost there</p>
      <h1 className="h1">Check your email</h1>
      <Notice tone="ok" title="Confirmation sent">We sent a link to {sent}. Open it, then <Link className="link" to="/login">log in</Link> to create or join your team.</Notice>
    </div>)

  return (
    <div className="container block narrow auth">
      <AuthTabs />
      <p className="mono kicker">Team account</p>
      <h1 className="h1">Create your account</h1>
      <p className="lede">Every player has their own login. After this step you create a team or join one with a 6-digit code.</p>
      {!backendConfigured && <Notice tone="warn" title="Backend not connected">Sign-up needs the Supabase keys in <code>.env.local</code>.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <form className="form" onSubmit={onSubmit}>
        <Field id="name" label="Your name">{(p) => <input {...p} name="name" maxLength="60" required autoComplete="name" />}</Field>
        <Field id="email" label="Email">{(p) => <input {...p} name="email" type="email" required autoComplete="email" />}</Field>
        <Field id="password" label="Password" hint="At least 8 characters.">{(p) => <input {...p} name="password" type="password" minLength="8" required autoComplete="new-password" />}</Field>
        <Field id="confirm" label="Confirm password">{(p) => <input {...p} name="confirm" type="password" minLength="8" required autoComplete="new-password" />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
        <p className="muted small">Already have an account? <Link className="link" to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
