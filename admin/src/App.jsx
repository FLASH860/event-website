import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAdmin } from './auth'
import { Loading } from '../../src/components/ui'
import Login from './pages/Login'
import Teams from './pages/Teams'
import Leaderboard from './pages/Leaderboard'
import Timer from './pages/Timer'

// Three tabs, nothing else.
const LINKS = [['/teams', 'Teams'], ['/leaderboard', 'Leaderboard'], ['/timer', 'Timer']]

function Shell() {
  const { status, user, signOut } = useAdmin()
  if (status === 'loading') return <Loading label="Checking session…" />
  if (status !== 'authed') return <Navigate to="/login" replace />
  return (
    <div className="admin">
      <aside className="admin__side">
        <p className="admin__brand"><span className="wordmark__pre">RAS:</span> Control</p>
        <p className="mono muted admin__role">ORGANISER CONSOLE</p>
        <nav aria-label="Organiser">{LINKS.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
        <div className="admin__foot">
          <p className="mono muted userid">{user?.email}</p>
          <button className="btn btn--ghost btn--sm" onClick={signOut}>Log out</button>
        </div>
      </aside>
      <main className="admin__main"><Outlet /></main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/teams" replace />} />
        <Route path="teams" element={<Teams />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="timer" element={<Timer />} />
        <Route path="*" element={<Navigate to="/teams" replace />} />
      </Route>
    </Routes>
  )
}
