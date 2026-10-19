import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../components/ui'
import { useAuth, homeFor } from '../auth/AuthContext'
import AuthTabs from '../components/AuthTabs'

export default function Login() {
  const { status, role, signIn, backendConfigured, notice, clearNotice } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (status === 'loading') return <Loading label="Checking session…" />
  if (status === 'authed') return <Navigate to={homeFor(role)} replace />

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setError(null); clearNotice()
    try {
      const r = await signIn(String(f.get('email')).trim(), String(f.get('password')))
      nav(homeFor(r), { replace: true })
    } catch (ex) { setError(ex.message) } finally { setBusy(false) }
  }

  return (
    <div className="container block narrow auth">
      <AuthTabs />
      <p className="mono kicker">Team access</p>
      <h1 className="h1">Log in</h1>
      <p className="lede">Use the email and password you signed up with. Your teammates log in with their own accounts.</p>

      {loc.state?.expired && <Notice tone="info" title="Please log in">Log in to continue.</Notice>}
      {notice && <Notice tone="warn" title="You were signed out">{notice}</Notice>}
      {!backendConfigured && <Notice tone="warn" title="Backend not connected">Login needs the Supabase keys in <code>.env.local</code>.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <form className="form" onSubmit={onSubmit} noValidate>
        <Field id="email" label="Email">{(p) => <input {...p} name="email" type="email" autoComplete="username" required />}</Field>
        <Field id="password" label="Password">{(p) => <input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
        <p className="muted small"><Link className="link" to="/forgot-password">Forgot password?</Link> · No account yet? <Link className="link" to="/signup">Create one</Link></p>
      </form>
    </div>
  )
}
