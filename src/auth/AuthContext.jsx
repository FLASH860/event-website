import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isBackendConfigured } from '../lib/supabase'
import { loadProvider } from './providers'
import { DEV_PREVIEW, getPreviewRole, setPreviewRole } from './devPreview'
import { SESSION, SESSION_MESSAGES } from '../config/session'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)
export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'team' ? '/team' : '/login')

const SID_KEY = 'ras_team_session_id'
// "Left the briefing early" lasts only for one login session; a new login must offer an uncompleted briefing again.
const clearBriefingLeft = () => { try { Object.keys(sessionStorage).filter((k) => k.startsWith('ras_briefing_left:')).forEach((k) => sessionStorage.removeItem(k)) } catch { /* ignore */ } }
const anon = { status: 'anon', user: null, role: null, preview: false, devLabel: null }

// Auth state + the "one login per team" lifecycle (claim -> heartbeat -> release).
// The provider (providers/) does the talking to the backend; the SERVER enforces the single session.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...anon, status: 'loading' })
  const [providerName, setProviderName] = useState(null)
  const [notice, setNotice] = useState(null)
  const provider = useRef(null)
  const sid = useRef(null)

  const sidStore = () => (provider.current?.name === 'mock' ? sessionStorage : localStorage)
  const saveSid = (v) => { sid.current = v; try { v ? sidStore().setItem(SID_KEY, v) : sidStore().removeItem(SID_KEY) } catch { /* ignore */ } }
  const devLabelFor = () => (provider.current?.name === 'mock' ? 'DEV MOCK AUTH — demo accounts, not real authentication' : null)

  const endLocally = useCallback((reason) => {
    clearBriefingLeft()
    saveSid(null)
    setNotice(reason ? SESSION_MESSAGES[reason] || SESSION_MESSAGES.expired : null)
    setState({ ...anon, devLabel: null })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Establish (or resume) the single team session. Returns { ok, reason? }.
  const establish = useCallback(async (session) => {
    const p = provider.current
    if (session.role !== 'team') return { ok: true }
    try {
      const stored = (() => { try { return sidStore().getItem(SID_KEY) } catch { return null } })()
      if (stored) {
        const b = await p.heartbeat(session.user, stored)
        if (b.valid) { sid.current = stored; return { ok: true } }
      }
      const c = await p.claimTeamSession(session.user)
      if (!c.ok) return { ok: false, reason: c.reason }
      saveSid(c.sessionId)
      return { ok: true }
    } catch (e) { return { ok: false, reason: e.code || 'network' } }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const accept = useCallback(async (session) => {
    const r = await establish(session)
    if (!r.ok) { await provider.current.signOut(); endLocally(r.reason); return r }
    setState({ status: 'authed', user: session.user, role: session.role, preview: provider.current.name === 'mock', devLabel: devLabelFor() })
    return r
  }, [establish, endLocally]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- init ----
  useEffect(() => {
    let off = () => {}, dead = false
    ;(async () => {
      const pr = getPreviewRole()
      if (pr) { setState({ status: 'authed', user: { email: `preview-${pr}@dev.local`, team: pr === 'team' ? { name: 'Preview Team', code: 'PREVIEW' } : undefined }, role: pr, preview: true, devLabel: 'DEV PREVIEW — not real authentication' }); return }
      const p = await loadProvider()
      if (dead) return
      provider.current = p; setProviderName(p.name)
      off = p.onSignedOut(() => endLocally('expired'))
      const s = await p.getInitialSession()
      if (dead) return
      if (!s) { setState({ ...anon }); return }
      await accept(s)
    })()
    return () => { dead = true; off() }
  }, [accept, endLocally])

  // ---- heartbeat: keeps this team's single session alive, and notices if it was displaced/revoked ----
  const teamAuthed = state.status === 'authed' && state.role === 'team' && !state.devLabel?.startsWith('DEV PREVIEW')
  useEffect(() => {
    if (!teamAuthed) return
    let busy = false
    const beat = async () => {
      if (busy || !sid.current) return
      busy = true
      try {
        const b = await provider.current.heartbeat(state.user, sid.current)
        if (!b.valid) { await provider.current.signOut(); endLocally(b.reason) }
      } catch { /* transient network error: keep the session, try again next beat */ }
      busy = false
    }
    const id = setInterval(beat, SESSION.heartbeatMs)
    const vis = () => { if (document.visibilityState === 'visible') beat() }
    document.addEventListener('visibilitychange', vis)
    // TODO(BACKEND): optionally release the lease on tab close (pagehide) via navigator.sendBeacon to an endpoint you expose.
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [teamAuthed, state.user, endLocally])

  const api = useMemo(() => ({
    ...state,
    notice, clearNotice: () => setNotice(null), providerName,
    backendConfigured: isBackendConfigured,
    mockAuth: providerName === 'mock',
    devPreview: DEV_PREVIEW,
    // audience 'team': identifier is the TEAM NAME; 'admin': organiser email. Roles are re-read from the server after sign-in.
    async signIn(identifier, password, audience = 'admin') {
      setNotice(null); clearBriefingLeft()
      const p = provider.current
      const session = audience === 'team' ? await p.signInTeam(identifier, password) : await p.signIn(identifier, password) // throws on bad credentials / not connected
      if (session.role !== audience) { try { await p.signOut() } catch { /* ignore */ } throw new Error(audience === 'team' ? 'Invalid team name or password.' : 'Invalid email or password.') }
      const r = await accept(session)
      if (!r.ok) { const e = new Error(SESSION_MESSAGES[r.reason] || SESSION_MESSAGES.network); e.code = r.reason; setNotice(null); throw e }
      return session.role
    },
    async signOut() {
      setPreviewRole(null)
      const p = provider.current
      try { if (p && sid.current && state.user) await p.releaseTeamSession(state.user, sid.current) } catch { /* best effort */ }
      try { if (p) await p.signOut() } catch { /* ignore */ }
      endLocally(null)
    },
    async resetPassword(email) { return provider.current.resetPassword(email) },
    startPreview(role) {
      if (!DEV_PREVIEW) return
      setPreviewRole(role)
      setState({ status: 'authed', user: { email: `preview-${role}@dev.local`, team: role === 'team' ? { name: 'Preview Team', code: 'PREVIEW' } : undefined }, role, preview: true, devLabel: 'DEV PREVIEW — not real authentication' })
    },
  }), [state, notice, providerName, accept, endLocally])

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
