import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field, Notice } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

export default function ForgotPassword() {
  const { resetPassword, backendConfigured } = useAuth()
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  async function onSubmit(e) {
    e.preventDefault()
    setPhase('sending'); setError('')
    try { await resetPassword(String(new FormData(e.currentTarget).get('email')).trim()); setPhase('done') }
    catch (ex) { setError(ex.message); setPhase('idle') }
  }
  return (
    <div className="container block narrow">
      <p className="mono kicker">Account recovery</p>
      <h1 className="h1">Reset password</h1>
      {!backendConfigured && <Notice tone="warn" title="Backend not connected">Password recovery needs the authentication backend. See the README.</Notice>}
      {phase === 'done'
        ? <Notice tone="ok" title="Check your email">If that address belongs to an account, a reset link has been sent.</Notice>
        : <form className="form" onSubmit={onSubmit} noValidate>
            {error && <Notice tone="error">{error}</Notice>}
            <Field id="email" label="Email">{(p) => <input {...p} name="email" type="email" autoComplete="email" required />}</Field>
            <Button type="submit" disabled={phase === 'sending'}>{phase === 'sending' ? 'Sending…' : 'Send reset link'}</Button>
          </form>}
      <p className="muted small"><Link className="link" to="/login">Back to login</Link></p>
    </div>
  )
}
