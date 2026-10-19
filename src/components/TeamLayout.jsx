import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Wordmark from './Wordmark'
import { useAuth } from '../auth/AuthContext'
import useMission from '../hooks/useMission'
import useBriefing from '../hooks/useBriefing'

// Information architecture. The mission screen does the work (question + progress). Everything else is one step away:
//   Mission (answer questions) · Overview (missions, components, score)
//   More: Rules, Replay briefing.  Log out and team identity stay visible in the bar.
function MoreMenu({ onReplay }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null), loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => {
    if (!open) return
    const out = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus() } }
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="more" ref={ref}>
      <button type="button" className="more__btn" aria-expanded={open} aria-haspopup="true" aria-controls="more-list" onClick={() => setOpen((v) => !v)}>More</button>
      {open && (
        <ul id="more-list" className="more__list">
          <li><a href="/rules" target="_blank" rel="noopener noreferrer">Full rules (new tab)</a></li>
          <li><button type="button" onClick={() => { setOpen(false); onReplay() }}>Replay mission briefing</button></li>
        </ul>
      )}
    </div>
  )
}

export default function TeamLayout() {
  const { user, signOut } = useAuth()
  const id = user?.id || user?.email || 'anon'
  const mission = useMission()
  const { overlay, startReplay, active: briefingActive } = useBriefing({ teamId: id, teamName: user?.team?.name, settings: mission.state?.settings })
  return (
    <div className="shell shell--team">
      <header className="tb">
        <div className="container tb__in">
          <Wordmark to="/team" />
          <nav className="tnav" aria-label="Team">
            <NavLink to="/team" end>Mission</NavLink>
            <NavLink to="/team/overview">Overview</NavLink>
            <MoreMenu onReplay={startReplay} />
          </nav>
          <div className="tb__user">
            <span className="ident" aria-label="Signed in team">
              <strong className="ident__name">{user?.team?.name ?? 'Team'}</strong>
              {user?.team && <span className="mono ident__id">{user.team.code}</span>}
            </span>
            <button className="btn btn--ghost btn--sm" onClick={signOut}>Log out</button>
          </div>
        </div>
      </header>
      <main className="container workspace"><Outlet context={{ mission, startReplay, briefingActive }} /></main>
      {overlay}
    </div>
  )
}
