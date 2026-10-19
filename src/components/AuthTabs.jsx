import { NavLink } from 'react-router-dom'

// Log in and Create account live together: one place, two tabs.
export default function AuthTabs() {
  return (
    <nav className="tabs" aria-label="Account">
      <NavLink to="/login" className={({ isActive }) => `btn btn--sm ${isActive ? 'btn--primary' : 'btn--ghost'}`}>Log in</NavLink>
      <NavLink to="/signup" className={({ isActive }) => `btn btn--sm ${isActive ? 'btn--primary' : 'btn--ghost'}`}>Create account</NavLink>
    </nav>
  )
}
