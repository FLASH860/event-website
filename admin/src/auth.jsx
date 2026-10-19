import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, configured, supabase } from './api'

const Ctx = createContext(null)
export const useAdmin = () => useContext(Ctx)

// Signs in with Supabase Auth, then asks the DATABASE who this is. Anyone whose profile role is not 'admin' is signed straight out.
export function AdminAuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  const check = useCallback(async () => {
    if (!configured) { setState({ status: 'anon', user: null }); return }
    const { data } = await supabase.auth.getSession()
    if (!data.session) { setState({ status: 'anon', user: null }); return }
    try {
      const p = await api.profile()
      if (p?.role === 'admin') setState({ status: 'authed', user: { id: p.id, email: p.email } })
      else { await supabase.auth.signOut(); setState({ status: 'anon', user: null }) }
    } catch { setState({ status: 'anon', user: null }) }
  }, [])

  useEffect(() => {
    check()
    if (!configured) return
    const { data } = supabase.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') setState({ status: 'anon', user: null }) })
    return () => data.subscription.unsubscribe()
  }, [check])

  const value = useMemo(() => ({
    ...state,
    async signIn(email, password) {
      if (!configured) throw new Error('Supabase keys are missing. Add them to .env.local in the project root.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Invalid email or password.')
      const p = await api.profile()
      if (p?.role !== 'admin') { await supabase.auth.signOut(); throw new Error('This account is not an organiser account.') }
      setState({ status: 'authed', user: { id: p.id, email: p.email } })
    },
    async signOut() { await supabase?.auth.signOut(); setState({ status: 'anon', user: null }) },
  }), [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
