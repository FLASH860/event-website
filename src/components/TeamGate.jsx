import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import TeamSetup from '../pages/TeamSetup'

// A signed-in player without a team sees the create/join screen instead of the mission.
export default function TeamGate() {
  const { user } = useAuth()
  return user?.team ? <Outlet /> : <TeamSetup />
}
