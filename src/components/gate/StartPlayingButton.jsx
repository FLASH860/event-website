import { useNavigate } from 'react-router-dom'
import { useGate } from './GateProvider'
import { useAuth, homeFor } from '../../auth/AuthContext'
import { formatInZone } from '../../lib/gate'

// Public entry to the gameplay area. Before/after the window it explains why (never a dead button).
export default function StartPlayingButton({ variant = 'primary', size, showStatus = true }) {
  const { gate, cfg, openDialog } = useGate()
  const { status, role } = useAuth()
  const nav = useNavigate()
  const isOpen = gate.state === 'open'
  const label = isOpen ? 'Enter the mission' : 'Start playing'

  const onClick = () => {
    if (!isOpen) return openDialog()
    nav(status === 'authed' ? homeFor(role) : '/login')
  }

  const line = {
    open: 'Mission active',
    locked: cfg?.startsAt ? `Opens ${formatInZone(cfg.startsAt, cfg.timeZone)}` : 'Not open yet',
    closed: 'Mission window closed',
    disabled: 'Gameplay not enabled yet',
    unconfigured: 'Opening time not announced',
  }[gate.state]

  return (
    <div className="startplay">
      <button type="button" className={`btn btn--${variant} ${size ? `btn--${size}` : ''} ${isOpen ? 'is-live' : ''}`}
        onClick={onClick} aria-haspopup={isOpen ? undefined : 'dialog'}>
        {label}
      </button>
      {showStatus && line && <p className={`startplay__line mono startplay__line--${gate.state}`}>{line}</p>}
    </div>
  )
}
