import { REGISTRATION_URL, EVENT } from '../../config/eventConfig'

// Registration is external. This never submits anything inside this site and never invents a URL.
export default function RegisterLink({ variant = 'primary', children = 'Register for the mission', size, showNote = true }) {
  const cls = `btn btn--${variant} ${size ? `btn--${size}` : ''}`
  if (!EVENT.registrationOpen) return <p className="muted">Registration is currently closed.</p>
  if (!REGISTRATION_URL) {
    return (
      <div className="startplay">
        <button type="button" className={cls} disabled aria-describedby="reg-note">{children}</button>
        {showNote && <p id="reg-note" className="startplay__line mono">Official link coming soon</p>}
      </div>
    )
  }
  return (
    <div className="startplay">
      <a className={cls} href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer">
        {children}<span className="sr"> (opens the official registration form in a new tab)</span>
      </a>
      {showNote && <p className="startplay__line mono">{EVENT.fee} · opens in a new tab</p>}
    </div>
  )
}
