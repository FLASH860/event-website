import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Field, Notice, Loading } from '../components/ui'
import AuthTabs from '../components/AuthTabs'
import { useAuth, homeFor } from '../auth/AuthContext'
import { createTeam, joinTeam } from '../auth/authApi'
import { TEAM_REASONS } from '../auth/teamReasons'

// One form does everything. With a 6-digit code you join that team; without one you create a team with the name you typed.
// Either way the player lands straight in the mission: no separate login step.
export default function Signup() {
  const { status, role, signUp, refresh, backendConfigured } = useAuth()
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null), [busy, setBusy] = useState(false), [sent, setSent] = useState(null)
  const joining = code.replace(/\s/g, '').length > 0
  if (status === 'loading') return <Loading label="Checking session…" />
  if (status === 'authed' && !busy) return <Navigate to={homeFor(role)} replace />

  async function onSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email')).trim(), password = String(f.get('password'))
    const teamName = String(f.get('team') || '').trim(), joinCode = code.replace(/\s/g, '')
    if (joinCode && !/^\d{6}$/.test(joinCode)) { setError('The team code is 6 digits.'); return }
    setBusy(true); setError(null)
    try {
      const name = email.split('@')[0]
      const r = await signUp({ name, email, password })
      if (r.needsConfirmation) { setSent(email); return }
      const t = joinCode ? await joinTeam(joinCode, name) : await createTeam(teamName, '', name)
      if (!t.ok && t.reason !== 'already_in_team') {
        // The account exists and is signed in; finish the team step on the setup screen with the reason shown.
        nav('/team', { replace: true, state: { teamError: `Your account is ready, but: ${TEAM_REASONS[t.reason] || 'the team step failed.'}`, mode: joinCode ? 'join' : 'create' } })
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
      <Notice tone="ok" title="Confirmation sent">We sent a link to {sent}. Open it, then <Link className="link" to="/login">log in</Link> to create or join your team.</Notice>
    </div>)

  return (
    <div className="container block narrow auth">
      <AuthTabs />
      <p className="mono kicker">Team account</p>
      <h1 className="h1">Create account</h1>
      <p className="lede">Creating the team? Enter its name. Joining a teammate? Enter their 6-digit code instead. You go straight into the mission either way.</p>
      {!backendConfigured && <Notice tone="warn" title="Backend not connected">Sign-up needs the Supabase keys in <code>.env.local</code>.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <form className="form" onSubmit={onSubmit}>
        <Field id="code" label="Team code (only if joining)" hint="6 digits from the teammate who created the team. Leave empty to create a new team.">
          {(p) => <input {...p} name="code" inputMode="numeric" pattern="[0-9 ]{0,7}" maxLength="7" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />}
        </Field>
        {!joining && <Field id="team" label="Team name">{(p) => <input {...p} name="team" minLength="2" maxLength="40" required autoComplete="off" />}</Field>}
        <Field id="email" label="Email">{(p) => <input {...p} name="email" type="email" required autoComplete="email" />}</Field>
        <Field id="password" label="Password" hint="At least 8 characters.">{(p) => <input {...p} name="password" type="password" minLength="8" required autoComplete="new-password" />}</Field>
        <Button type="submit" disabled={busy}>{busy ? 'Setting up…' : joining ? 'Create account and join team' : 'Create account and team'}</Button>
        <p className="muted small">Already have an account? <Link className="link" to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
