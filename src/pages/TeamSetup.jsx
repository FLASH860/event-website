import { useState } from 'react'
import { Button, Field, Notice } from '../components/ui'
import Wordmark from '../components/Wordmark'
import { useAuth } from '../auth/AuthContext'
import { createTeam, joinTeam } from '../auth/authApi'
import { EVENT } from '../config/eventConfig'

const REASONS = {
  name_taken: 'That team name is already taken. Choose another.',
  invalid_name: 'Team names must be 2 to 40 characters.',
  invalid_code: 'No team has that code. Check the 6 digits with your teammate.',
  team_full: `That team is already full (${EVENT.teamMax} members).`,
  too_many: 'Too many wrong codes. Wait about 10 minutes and try again.',
  already_in_team: 'You are already in a team.',
  not_allowed: 'This account cannot join a team.',
}

// Shown to a signed-in player who has no team yet: one person creates the team, everyone else joins with its 6-digit code.
export default function TeamSetup() {
  const { user, refresh, signOut } = useAuth()
  const [mode, setMode] = useState('create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function run(fn) {
    setBusy(true); setError(null)
    try {
      const r = await fn()
      if (r.ok || r.reason === 'already_in_team') await refresh()
      else setError(REASONS[r.reason] || 'Something went wrong. Try again.')
    } catch { setError('Could not reach the server. Try again.') } finally { setBusy(false) }
  }
  const onCreate = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => createTeam(String(f.get('name')).trim(), String(f.get('college')).trim(), user?.name)) }
  const onJoin = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => joinTeam(String(f.get('code')).replace(/\s/g, ''), user?.name)) }

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
            <Button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join team'}</Button>
          </form>}

      <p className="muted small" style={{ marginTop: '1.5rem' }}>Signed in as {user?.email}. <button type="button" className="link linkbtn" onClick={signOut}>Log out</button></p>
    </div>
  )
}
