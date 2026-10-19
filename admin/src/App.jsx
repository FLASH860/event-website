import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAdmin } from './auth'
import { Loading } from '../../src/components/ui'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Teams from './pages/Teams'
import Attempts from './pages/Attempts'
import Questions from './pages/Questions'
import Checkpoints from './pages/Checkpoints'
import Announcements from './pages/Announcements'
import Scores from './pages/Scores'
import Settings from './pages/Settings'
import Audit from './pages/Audit'

const LINKS = [
  ['/', 'Overview', true], ['/teams', 'Teams'], ['/attempts', 'Live attempts'], ['/questions', 'Questions'], ['/checkpoints', 'Checkpoints'],
  ['/announcements', 'Announcements'], ['/scores', 'Scores & results'], ['/settings', 'Settings'], ['/audit', 'Audit'],
]

function Shell() {
  const { status, user, signOut } = useAdmin()
  if (status === 'loading') return <Loading label="Checking session…" />
  if (status !== 'authed') return <Navigate to="/login" replace />
  return (
    <div className="admin">
      <aside className="admin__side">
        <p className="admin__brand"><span className="wordmark__pre">RAS:</span> Control</p>
        <p className="mono muted admin__role">ORGANISER CONSOLE</p>
        <nav aria-label="Organiser">{LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}</nav>
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
        <Route index element={<Overview />} />
        <Route path="teams" element={<Teams />} />
        <Route path="attempts" element={<Attempts />} />
        <Route path="questions" element={<Questions />} />
        <Route path="checkpoints" element={<Checkpoints />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="scores" element={<Scores />} />
        <Route path="settings" element={<Settings />} />
        <Route path="audit" element={<Audit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
