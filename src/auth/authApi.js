import { supabase, isBackendConfigured, NotConnectedError } from '../lib/supabase'
import { rpc } from '../lib/api'

// The ONLY place the browser talks to Supabase Auth. Roles and team membership come from the database
// (get_my_profile), never from the client or from user-editable metadata.
const need = () => { if (!isBackendConfigured) throw new NotConnectedError() }

// -> { user: { id, email, name, team }, role } | null.  team = { id, name, code, college, joinCode, maxMembers, members[] } | null
export async function loadProfile() {
  const p = await rpc('get_my_profile')
  if (!p) return null
  return { user: { id: p.id, email: p.email, name: p.displayName, team: p.team }, role: p.role }
}

export async function getInitialSession() {
  if (!isBackendConfigured) return null
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) return null
  try { return await loadProfile() } catch { return null }
}

// Fires when Supabase ends the session itself (expiry, or sign-out in another tab).
export function onSignedOut(cb) {
  if (!isBackendConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') cb() })
  return () => data.subscription.unsubscribe()
}

export async function signUp({ name, email, password }) {
  need()
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name }, emailRedirectTo: `${window.location.origin}/login` },
  })
  if (error) throw new Error(/registered|already/i.test(error.message) ? 'An account with this email already exists. Log in instead.' : error.message)
  // Supabase answers a repeat sign-up with an empty identities list instead of an error.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('An account with this email already exists. Log in instead.')
  return { needsConfirmation: !data.session }
}

export async function signIn(email, password) {
  need()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(/confirm/i.test(error.message) ? 'Confirm your email first: open the link we sent you, then log in.' : 'Invalid email or password.')
  return loadProfile()
}

export async function signOut() { if (isBackendConfigured) await supabase.auth.signOut() }

export async function resetPassword(email) {
  need()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
  if (error) throw new Error('Could not send the reset email. Try again shortly.')
}

export async function updatePassword(password) {
  need()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

// ---- teams ----
export const createTeam = (name, college, displayName) => rpc('create_team', { p_name: name, p_college: college, p_display_name: displayName })
export const joinTeam = (code, displayName) => rpc('join_team', { p_code: code, p_display_name: displayName })
export const leaveTeam = () => rpc('leave_team')
