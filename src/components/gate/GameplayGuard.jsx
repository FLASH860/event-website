import { Outlet } from 'react-router-dom'
import { useGate } from './GateProvider'
import { useAuth } from '../../auth/AuthContext'
import { gateCopy } from '../../lib/gate'
import Wordmark from '../Wordmark'
import TeamCard from '../TeamCard'
import { Button, Loading } from '../ui'

// UX layer ONLY: shows the locked screen outside the window. Real enforcement is _assert_open() inside every gameplay
// function in the database, so skipping this component gains nothing.
export default function GameplayGuard() {
  const { gate, cfg } = useGate()
  const { signOut } = useAuth()
  if (gate.state === 'open') return <Outlet />
  if (gate.state === 'loading') return <Loading label="Checking the mission window…" />
  const c = gateCopy(gate, cfg)
  return (
    <div className="container block narrow">
      <Wordmark />
      <h1 className="h1" style={{ marginTop: '2rem' }}>{c.title}</h1>
      <p className="lede">{c.body}</p>
      <TeamCard />
      <div className="row" style={{ marginTop: '1.5rem' }}>
        <Button to="/">Back to landing page</Button>
        <Button variant="ghost" type="button" onClick={signOut}>Log out</Button>
      </div>
    </div>
  )
}
