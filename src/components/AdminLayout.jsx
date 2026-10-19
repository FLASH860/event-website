import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const LINKS = [
  ['/admin', 'Overview', true], ['/admin/teams', 'Teams'], ['/admin/rounds', 'Rounds'], ['/admin/questions', 'Questions'],
  ['/admin/checkpoints', 'Checkpoints'], ['/admin/submissions', 'Submissions'], ['/admin/results', 'Results'], ['/admin/announcements', 'Announcements'], ['/admin/audit', 'Audit'],
]

// Organiser console: a separate operational workspace with a persistent sidebar.
export default function AdminLayout() {
  const { user, signOut, devLabel } = useAuth()
  return (
    <div className="admin">
      {devLabel && <div className="devbar">{devLabel}</div>}
      <aside className="admin__side">
        <p className="admin__brand"><span className="wordmark__pre">RAS:</span> Control</p>
        <p className="mono muted admin__role">EVENT HEAD</p>
        <nav aria-label="Event head">
          {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        </nav>
        <div className="admin__foot">
          <p className="mono muted userid">{user?.email}</p>
          <button className="btn btn--ghost btn--sm" onClick={signOut}>Log out</button>
        </div>
      </aside>
      <main className="admin__main"><Outlet /></main>
    </div>
  )
}
