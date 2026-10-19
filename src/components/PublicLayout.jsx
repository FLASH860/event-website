import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Wordmark from './Wordmark'
import StartPlayingButton from './gate/StartPlayingButton'
import { EVENT, REGISTRATION_URL } from '../config/eventConfig'

export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()

  useEffect(() => {
    setOpen(false)
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 0)
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="container topbar__in">
          <Wordmark />
          <button className="menu-btn" aria-expanded={open} aria-controls="pub-nav" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
          <nav id="pub-nav" className={`nav ${open ? 'is-open' : ''}`} aria-label="Primary">
            <Link to="/#briefing">Mission briefing</Link>
            <NavLink to="/rules">Rules</NavLink>
            <NavLink to="/register">Register</NavLink>
            <NavLink to="/signup">Create account</NavLink>
            <NavLink to="/login">Log in</NavLink>
            <span className="nav__play"><StartPlayingButton variant="ghost" size="sm" showStatus={false} /></span>
          </nav>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="footer">
        <div className="container footer__in">
          <div>
            <p className="footer__name"><span className="wordmark__pre">RAS:</span> Mission Impossible</p>
            <p className="muted">{EVENT.hostFull}</p>
          </div>
          <ul className="plain footer__meta">
            <li>{EVENT.dateLabel}</li><li>{EVENT.time}</li><li>{EVENT.venue}</li>
          </ul>
          <ul className="plain">
            <li><Link to="/rules">Rules</Link></li>
            <li>{REGISTRATION_URL ? <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer">Register</a> : <Link to="/register">Register</Link>}</li>
            <li><Link to="/signup">Create team account</Link></li>
            <li><Link to="/login">Team login</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  )
}
