import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isBackendConfigured } from '../lib/supabase'
import * as api from './authApi'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)
export const homeFor = (role) => (role === 'team' ? '/team' : '/login')

// "Left the briefing early" lasts only for one login session; a new login must offer an uncompleted briefing again.
const clearBriefingLeft = () => { try { Object.keys(sessionStorage).filter((k) => k.startsWith('ras_briefing_left:')).forEach((k) => sessionStorage.removeItem(k)) } catch { /* ignore */ } }
const anon = { status: 'anon', user: null, role: null }

// Auth state for players. Organisers use the separate admin app (/admin in the repo), never this site.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...anon, status: 'loading' })
  const [notice, setNotice] = useState(null)

  const apply = useCallback((s) => setState(s ? { status: 'authed', user: s.user, role: s.role } : { ...anon }), [])

  useEffect(() => {
    let dead = false
    api.getInitialSession().then((s) => { if (!dead) apply(s) })
    const off = api.onSignedOut(() => { clearBriefingLeft(); setNotice('Your session expired. Please log in again.'); setState({ ...anon }) })
    return () => { dead = true; off() }
  }, [apply])

  const value = useMemo(() => ({
    ...state, notice, clearNotice: () => setNotice(null), backendConfigured: isBackendConfigured,
    async signIn(email, password) {
      setNotice(null); clearBriefingLeft()
      const s = await api.signIn(email, password)
      if (!s) { await api.signOut(); throw new Error('This account has no profile. Contact the organisers.') }
      if (s.role !== 'team') { await api.signOut(); throw new Error('This is an organiser account. Organisers use the separate admin app.') }
      apply(s); return s.role
    },
    // -> { needsConfirmation }. With email confirmation off the user is signed in straight away.
    async signUp(details) {
      setNotice(null); clearBriefingLeft()
      const r = await api.signUp(details)
      if (!r.needsConfirmation) apply(await api.getInitialSession())
      return r
    },
    async signOut() { try { await api.signOut() } catch { /* ignore */ } clearBriefingLeft(); setState({ ...anon }) },
    // Re-reads profile + team from the server (after creating, joining or leaving a team).
    async refresh() { apply(await api.getInitialSession()) },
    resetPassword: api.resetPassword,
    updatePassword: api.updatePassword,
  }), [state, notice, apply])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
