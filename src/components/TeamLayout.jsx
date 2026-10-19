import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Wordmark from './Wordmark'
import { useAuth } from '../auth/AuthContext'
import useMission from '../hooks/useMission'
import useBriefing from '../hooks/useBriefing'
import useAnnouncements from '../hooks/useAnnouncements'

// Information architecture. The mission screen does the work (question + progress). Everything else is one step away:
//   Mission (answer questions) · Overview (stages, components, score) · Announcements (unread dot)
//   More: Scan, Submissions, Rules, Replay briefing.  Log out and team identity stay visible in the bar.
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
          <li><NavLink to="/team/scan">Checkpoint scanner</NavLink></li>
          <li><NavLink to="/team/submissions">Submission history</NavLink></li>
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
  const news = useAnnouncements(id)
  const { overlay, startReplay, active: briefingActive } = useBriefing({ teamId: id, teamName: user?.team?.name, settings: mission.state?.settings })
  const unread = news.unread.length
  return (
    <div className="shell shell--team">
      <header className="tb">
        <div className="container tb__in">
          <Wordmark to="/team" />
          <nav className="tnav" aria-label="Team">
            <NavLink to="/team" end>Mission</NavLink>
            <NavLink to="/team/overview">Overview</NavLink>
            <NavLink to="/team/announcements" className="tnav__news">Announcements{unread > 0 && <><span className="tnav__dot" aria-hidden="true" /><span className="sr"> ({unread} unread)</span></>}</NavLink>
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
      <main className="container workspace"><Outlet context={{ mission, news, startReplay, briefingActive }} /></main>
      {overlay}
    </div>
  )
}
