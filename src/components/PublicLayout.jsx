import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Wordmark from './Wordmark'
import StartPlayingButton from './gate/StartPlayingButton'
import { useGate } from './gate/GateProvider'
import { EVENT, REGISTRATION_URL } from '../config/eventConfig'
import { useAuth } from '../auth/AuthContext'
import { DEMO_TOOLS } from '../lib/demo'

export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { devLabel } = useAuth()
  const { demo, setDemo } = useGate()
  const { pathname, hash } = useLocation()

  useEffect(() => {
    setOpen(false)
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 0)
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      {devLabel && <div className="devbar">{devLabel}</div>}
      <header className="topbar">
        <div className="container topbar__in">
          <Wordmark />
          <button className="menu-btn" aria-expanded={open} aria-controls="pub-nav" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
          <nav id="pub-nav" className={`nav ${open ? 'is-open' : ''}`} aria-label="Primary">
            <Link to="/#briefing">Mission briefing</Link>
            <NavLink to="/rules">Rules</NavLink>
            <NavLink to="/register">Register</NavLink>
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
            <li><Link to="/login">Team login</Link></li>
            <li><Link to="/login/admin">Event head login</Link></li>
          </ul>
        </div>
        {DEMO_TOOLS && import.meta.env.DEV && (
          <div className="container">
            <details className="demo">
              <summary>Demonstration: preview Start Playing states</summary>
              <p className="muted small">Changes only what this page displays. It does not change who can play.</p>
              <div className="row">
                {[[null, 'Live'], ['locked', 'Not yet open'], ['open', 'Open'], ['closed', 'Closed'], ['disabled', 'Disabled']].map(([v, l]) => (
                  <button key={l} type="button" className={`btn btn--sm ${demo === v ? 'btn--primary' : 'btn--ghost'}`} aria-pressed={demo === v} onClick={() => setDemo(v)}>{l}</button>
                ))}
              </div>
            </details>
          </div>
        )}
      </footer>
    </div>
  )
}
