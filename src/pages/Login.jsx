import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../components/ui'
import { useAuth, homeFor } from '../auth/AuthContext'

export default function Login({ audience = 'team' }) {
  const { status, role, signIn, backendConfigured, mockAuth, providerName, notice, clearNotice, devPreview, startPreview } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [error, setError] = useState(null) // { message, code }
  const [busy, setBusy] = useState(false)
  const [accounts, setAccounts] = useState([])
  const form = useRef(null)
  const isAdmin = audience === 'admin'

  // DEV ONLY: demo credentials are loaded dynamically behind import.meta.env.DEV, so they never reach production builds.
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true') import('../auth/devAccounts.js').then((m) => setAccounts(m.DEV_ACCOUNTS))
  }, [])

  if (status === 'loading') return <Loading label="Checking session…" />
  if (status === 'authed') return <Navigate to={homeFor(role)} replace />

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setError(null); clearNotice()
    try {
      const id = isAdmin ? String(f.get('email')).trim() : String(f.get('team')).trim()
      const r = await signIn(id, String(f.get('password')), isAdmin ? 'admin' : 'team')
      nav(homeFor(r), { replace: true })
    } catch (ex) { setError({ message: ex.message, code: ex.code }) } finally { setBusy(false) }
  }
  const fill = (a) => { if (isAdmin) form.current.email.value = a.email; else form.current.team.value = a.team?.name ?? ''; form.current.password.value = a.password }

  return (
    <div className="container block narrow auth">
      <p className="mono kicker">{isAdmin ? 'Event head access' : 'Team access'}</p>
      <h1 className="h1">{isAdmin ? 'Event head login' : 'Team login'}</h1>
      <p className="lede">{isAdmin ? 'For authorised organisers only.' : 'One login per team. Use the team credentials the organisers issued; only one member can be signed in at a time.'}</p>

      {loc.state?.expired && <Notice tone="info" title="Please log in">Log in to continue.</Notice>}
      {notice && <Notice tone="warn" title="You were signed out">{notice}</Notice>}
      {providerName === 'none' && !backendConfigured && <Notice tone="warn" title="Backend not connected">Login cannot work until the authentication backend is connected. See docs/BACKEND_HANDOVER.md.</Notice>}
      {error && <Notice tone="error" title={error.code === 'team_session_active' ? 'Team already logged in' : undefined}>{error.message}</Notice>}

      <form className="form" ref={form} onSubmit={onSubmit} noValidate>
        {isAdmin
          ? <Field id="email" label="Email">{(p) => <input {...p} name="email" type="email" autoComplete="username" required />}</Field>
          : <Field id="team" label="Team name">{(p) => <input {...p} name="team" type="text" autoComplete="username" autoCapitalize="none" spellCheck="false" required />}</Field>}
        <Field id="password" label="Password">{(p) => <input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
        <p className="muted small">{isAdmin ? <><Link className="link" to="/forgot-password">Forgot password?</Link> · <Link className="link" to="/login">Team login</Link></> : <>Lost your password? Ask an organiser. · Not registered? <Link className="link" to="/register">Register</Link></>}</p>
      </form>

      {mockAuth && accounts.length > 0 && (
        <div className="devbox">
          <p className="mono">DEV MOCK AUTH — demo accounts only. Not real security; removed from production builds.</p>
          <table className="table"><thead><tr><th scope="col">Account</th><th scope="col">{isAdmin ? 'Email' : 'Team name'}</th><th scope="col">Password</th><th scope="col"><span className="sr">Fill</span></th></tr></thead>
            <tbody>{accounts.filter((a) => (isAdmin ? a.role === 'admin' : a.role === 'team')).map((a) => (
              <tr key={a.email}><th scope="row">{a.label}</th><td className="mono">{isAdmin ? a.email : a.team.name}</td><td className="mono">{a.password}</td>
                <td><Button type="button" variant="ghost" size="sm" onClick={() => fill(a)}>Fill</Button></td></tr>))}</tbody></table>
          <p className="muted small">Test one-login-per-team: log in as Team Alpha here, then open a second tab and try Team Alpha again. It is blocked while the first tab is active (the lease expires about 45 s after the first tab closes).</p>
        </div>
      )}

      {devPreview && !mockAuth && (
        <div className="devbox">
          <p className="mono">DEV PREVIEW — layouts only, no real authentication, no real data</p>
          <div className="row">
            <Button variant="ghost" type="button" onClick={() => { startPreview('team'); nav('/team') }}>Preview team layout</Button>
            <Button variant="ghost" type="button" onClick={() => { startPreview('admin'); nav('/admin') }}>Preview admin layout</Button>
          </div>
        </div>
      )}
    </div>
  )
}
