import { DEV_ACCOUNTS } from '../devAccounts'

// DEV ONLY. Simulates the backend so the frontend can be built and demoed without it. NOT secure, NOT real.
// - Each BROWSER TAB acts as a separate "device" (auth session in sessionStorage).
// - The per-team lease lives in localStorage (shared by tabs) to imitate the server's team_sessions table,
//   so you can test "one login per team": log in as Team Alpha in tab 1, then try tab 2.
// - A lease expires 45 s after its last heartbeat (the real server decides its own length).
const AUTH = 'ras_mock_auth', LEASES = 'ras_mock_leases', STALE_MS = 45000
const rd = (s, k) => { try { return JSON.parse(s.getItem(k)) } catch { return null } }
const wr = (s, k, v) => { try { v == null ? s.removeItem(k) : s.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }
const leases = () => rd(localStorage, LEASES) || {}
const toSession = (a) => ({ user: { id: `mock-${a.email}`, email: a.email, team: a.team }, role: a.role })
const code = (user) => user?.team?.code

export const mockProvider = {
  name: 'mock',
  async getInitialSession() { const a = rd(sessionStorage, AUTH); return a ? toSession(a) : null },
  onSignedOut: () => () => {},
  // Participants sign in with TEAM NAME + password. (DEV mock only; the real lookup happens on the server.)
  async signInTeam(teamName, password) {
    const n = String(teamName).trim().toLowerCase()
    const a = DEV_ACCOUNTS.find((x) => x.role === 'team' && x.team.name.toLowerCase() === n && x.password === password)
    if (!a) throw new Error('Invalid team name or password.')
    wr(sessionStorage, AUTH, a)
    return toSession(a)
  },
  async signIn(email, password) {
    const a = DEV_ACCOUNTS.find((x) => x.email === email.toLowerCase() && x.password === password)
    if (!a) throw new Error('Invalid email or password.')
    wr(sessionStorage, AUTH, a)
    return toSession(a)
  },
  async signOut() { wr(sessionStorage, AUTH, null) },
  async resetPassword() { throw new Error('Password reset is not available in mock mode.') },

  async claimTeamSession(user) {
    const all = leases(), cur = all[code(user)]
    if (cur && Date.now() - cur.last < STALE_MS) return { ok: false, reason: 'team_session_active' }
    const sessionId = crypto.randomUUID()
    all[code(user)] = { sid: sessionId, last: Date.now() }
    wr(localStorage, LEASES, all)
    return { ok: true, sessionId }
  },
  async heartbeat(user, sessionId) {
    const all = leases(), cur = all[code(user)]
    if (!cur || cur.sid !== sessionId) return { valid: false, reason: cur ? 'displaced' : 'revoked' }
    cur.last = Date.now(); wr(localStorage, LEASES, all)
    return { valid: true }
  },
  async releaseTeamSession(user, sessionId) {
    const all = leases()
    if (all[code(user)]?.sid === sessionId) { delete all[code(user)]; wr(localStorage, LEASES, all) }
  },
}
