import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, homeFor } from './AuthContext'
import { Loading } from '../components/ui'

// UX convenience only. Real protection is Row Level Security / server functions in the backend.
// TODO(BACKEND): UX only. Real protection = RLS + role checks inside server functions; never trust this component.
export default function ProtectedRoute({ role }) {
  const { status, role: userRole } = useAuth()
  const loc = useLocation()
  if (status === 'loading') return <Loading label="Checking session…" />
  if (status !== 'authed') return <Navigate to={role === 'admin' ? '/login/admin' : '/login'} replace state={{ from: loc.pathname, expired: true }} />
  if (userRole !== role) return <Navigate to={homeFor(userRole)} replace />
  return <Outlet />
}
