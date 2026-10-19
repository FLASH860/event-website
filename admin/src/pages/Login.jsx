import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../../../src/components/ui'
import { useAdmin } from '../auth'
import { configured } from '../api'

export default function Login() {
  const { status, signIn } = useAdmin()
  const [error, setError] = useState(null), [busy, setBusy] = useState(false)
  if (status === 'loading') return <Loading label="Checking session…" />
  if (status === 'authed') return <Navigate to="/" replace />
  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setError(null)
    try { await signIn(String(f.get('email')).trim(), String(f.get('password'))) } catch (ex) { setError(ex.message) } finally { setBusy(false) }
  }
  return (
    <div className="authbox">
      <p className="mono kicker">Organiser console</p>
      <h1 className="h1">RAS: Control</h1>
      <p className="lede">For organisers only. This console runs on this computer and is not part of the public website.</p>
      {!configured && <Notice tone="warn" title="Supabase keys missing">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to <code>.env.local</code> in the project root, then restart.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <form className="form" onSubmit={onSubmit}>
        <Field id="email" label="Email">{(p) => <input {...p} name="email" type="email" autoComplete="username" required />}</Field>
        <Field id="password" label="Password">{(p) => <input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
      </form>
    </div>
  )
}
