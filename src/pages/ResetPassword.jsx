import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

// The emailed reset link signs the player in temporarily; here they choose a new password.
export default function ResetPassword() {
  const { status, updatePassword } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState(null), [busy, setBusy] = useState(false)
  if (status === 'loading') return <Loading label="Checking your reset link…" />
  if (status !== 'authed') return (
    <div className="container block narrow">
      <h1 className="h1">Reset link not valid</h1>
      <Notice tone="warn">This link has expired or was already used. <Link className="link" to="/forgot-password">Request a new one</Link>.</Notice>
    </div>)

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget), password = String(f.get('password'))
    if (password !== String(f.get('confirm'))) { setError('The two passwords do not match.'); return }
    setBusy(true); setError(null)
    try { await updatePassword(password); nav('/team', { replace: true }) } catch (ex) { setError(ex.message) } finally { setBusy(false) }
  }
  return (
    <div className="container block narrow">
      <p className="mono kicker">Account recovery</p>
      <h1 className="h1">Choose a new password</h1>
      {error && <Notice tone="error">{error}</Notice>}
      <form className="form" onSubmit={onSubmit}>
        <Field id="password" label="New password" hint="At least 8 characters.">{(p) => <input {...p} name="password" type="password" minLength="8" required autoComplete="new-password" />}</Field>
        <Field id="confirm" label="Confirm new password">{(p) => <input {...p} name="confirm" type="password" minLength="8" required autoComplete="new-password" />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</Button>
      </form>
    </div>
  )
}
