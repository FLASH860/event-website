import { useState } from 'react'
import { Button, Field, Notice } from '../components/ui'
import Wordmark from '../components/Wordmark'
import { useAuth } from '../auth/AuthContext'
import { createTeam, loginWithCode } from '../auth/authApi'
import { EVENT } from '../config/eventConfig'
import { TEAM_REASONS as REASONS } from '../auth/teamReasons'
import { useLocation } from 'react-router-dom'


// Shown to a signed-in player who has no team yet: one person creates the team, everyone else joins with its 6-digit code.
export default function TeamSetup() {
  const { user, refresh, signOut } = useAuth()
  const loc = useLocation()
  const [mode, setMode] = useState(loc.state?.mode || 'create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(loc.state?.teamError || null)

  async function run(fn) {
    setBusy(true); setError(null)
    try {
      const r = await fn()
      if (r.ok || r.reason === 'already_in_team') await refresh()
      else setError(REASONS[r.reason] || 'Something went wrong. Try again.')
    } catch { setError('Could not reach the server. Try again.') } finally { setBusy(false) }
  }
  const onCreate = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => createTeam(String(f.get('name')).trim(), String(f.get('college')).trim(), user?.name)) }
  const onJoin = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => loginWithCode(String(f.get('code')).replace(/\s/g, ''), String(f.get('name')).trim())) }

  return (
    <div className="container block narrow">
      <Wordmark />
      <p className="mono kicker" style={{ marginTop: '2rem' }}>Welcome{user?.name ? `, ${user.name}` : ''}</p>
      <h1 className="h1">Set up your team</h1>
      <p className="lede">Teams are {EVENT.teamSize}. One member creates the team and shares its 6-digit join code. Everyone else joins with that code.</p>

      <div className="tabs" role="tablist" aria-label="Team setup">
        <button role="tab" type="button" aria-selected={mode === 'create'} className={`btn btn--sm ${mode === 'create' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => { setMode('create'); setError(null) }}>Create a team</button>
        <button role="tab" type="button" aria-selected={mode === 'join'} className={`btn btn--sm ${mode === 'join' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => { setMode('join'); setError(null) }}>Join with a code</button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {mode === 'create'
        ? <form className="form" onSubmit={onCreate}>
            <Field id="tname" label="Team name">{(p) => <input {...p} name="name" minLength="2" maxLength="40" required autoComplete="off" />}</Field>
            <Field id="tcollege" label="College (optional)">{(p) => <input {...p} name="college" maxLength="80" autoComplete="organization" />}</Field>
            <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create team'}</Button>
          </form>
        : <form className="form" onSubmit={onJoin}>
            <Field id="tcode" label="6-digit join code" hint="Ask the teammate who created the team.">{(p) => <input {...p} name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength="7" autoComplete="off" required />}</Field>
            <Field id="tjname" label="Your name">{(p) => <input {...p} name="name" maxLength="40" required defaultValue={user?.name || ''} autoComplete="name" />}</Field>
            <Button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join team'}</Button>
          </form>}

      <p className="muted small" style={{ marginTop: '1.5rem' }}>Signed in as {user?.email || user?.name || 'a guest'}. <button type="button" className="link linkbtn" onClick={signOut}>Log out</button></p>
    </div>
  )
}
