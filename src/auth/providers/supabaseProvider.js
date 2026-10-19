import { supabase } from '../../lib/supabase'

// ===================== BACKEND INTEGRATION POINT (auth) =====================
// TODO(BACKEND): This file is the ONLY place auth talks to Supabase. Replace/extend freely as long as the
// returned shapes stay the same. Full contracts + SQL: docs/BACKEND_HANDOVER.md and supabase/schema.sql.
//
// Shapes:
//   session  = { user: { id, email, team?: { name, code } }, role: 'team' | 'admin' }
//   claim    = { ok: true, sessionId } | { ok: false, reason: 'team_session_active' | 'not_a_team' }
//   beat     = { valid: true } | { valid: false, reason: 'displaced' | 'expired' | 'revoked' }
// ============================================================================

// TODO(BACKEND): role must come from the server (profiles table + RLS), never from the client.
async function loadSession(authUser) {
  const { data: profile, error } = await supabase.from('profiles').select('role, team_id').eq('id', authUser.id).maybeSingle()
  if (error || !profile || !['team', 'admin'].includes(profile.role)) return null
  let team
  if (profile.role === 'team' && profile.team_id) {
    // TODO(BACKEND): `teams` table (id, name, code, college). Team members only see their own row via RLS.
    const { data } = await supabase.from('teams').select('name, code').eq('id', profile.team_id).maybeSingle()
    if (data) team = { name: data.name, code: data.code }
  }
  return { user: { id: authUser.id, email: authUser.email, team }, role: profile.role }
}

export const supabaseProvider = {
  name: 'supabase',

  async getInitialSession() {
    const { data } = await supabase.auth.getSession()
    return data.session?.user ? loadSession(data.session.user) : null
  },

  // Fires when Supabase ends the session itself (expiry / sign out in another tab).
  onSignedOut(cb) {
    const { data } = supabase.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') cb() })
    return () => data.subscription.unsubscribe()
  },

  // TODO(BACKEND): Team credentials are issued by organisers (one account per TEAM, shared by its members).
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Invalid email or password.')
    const s = await loadSession(data.user)
    if (!s) { await supabase.auth.signOut(); const e = new Error('no access'); e.code = 'not_a_team'; throw e }
    return s
  },

  // TEAM NAME LOGIN. The browser never learns or sends the internal email. It posts team name + password to a server
  // function that resolves the team, authenticates it, and returns a normal Supabase session. Failure is deliberately
  // uniform (no hint whether the team exists), and the server must rate-limit attempts.
  // TODO(BACKEND): Edge Function `team-login` ({ team_name, password } -> { access_token, refresh_token }). See docs/BACKEND_HANDOVER.md section 8.
  async signInTeam(teamName, password) {
    const { data, error } = await supabase.functions.invoke('team-login', { body: { team_name: String(teamName).trim(), password } })
    if (error || !data?.access_token) throw new Error('Invalid team name or password.')
    const { data: set, error: e2 } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
    if (e2 || !set.user) throw new Error('Invalid team name or password.')
    const s = await loadSession(set.user)
    if (!s || s.role !== 'team') { await supabase.auth.signOut(); const e = new Error('no access'); e.code = 'not_a_team'; throw e }
    return s
  },

  async signOut() { await supabase.auth.signOut() },

  async resetPassword(email) {
    // TODO(BACKEND): set the real redirect page for password updates.
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    if (error) throw new Error('Could not send the reset email. Try again shortly.')
  },

  // ---- ONE LOGIN PER TEAM -------------------------------------------------
  // TODO(BACKEND): RPC claim_team_session(p_device text) -> jsonb. Must be atomic: succeed only if the team has no
  // live session (no row, or last_seen older than the lease). See schema.sql.
  async claimTeamSession() {
    const { data, error } = await supabase.rpc('claim_team_session', { p_device: navigator.userAgent.slice(0, 120) })
    if (error || !data) { const e = new Error('network'); e.code = 'network'; throw e }
    return { ok: data.ok, sessionId: data.session_id, reason: data.reason }
  },

  // TODO(BACKEND): RPC heartbeat_team_session(p_session_id uuid) -> jsonb { valid, reason? }. Refreshes last_seen.
  async heartbeat(_user, sessionId) {
    const { data, error } = await supabase.rpc('heartbeat_team_session', { p_session_id: sessionId })
    if (error || !data) { const e = new Error('network'); e.code = 'network'; throw e }
    return { valid: data.valid, reason: data.reason }
  },

  // TODO(BACKEND): RPC release_team_session(p_session_id uuid). Frees the team on logout.
  async releaseTeamSession(_user, sessionId) {
    await supabase.rpc('release_team_session', { p_session_id: sessionId })
  },
}
