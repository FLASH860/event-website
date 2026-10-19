import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import PublicLayout from './components/PublicLayout'
import TeamLayout from './components/TeamLayout'
import TeamGate from './components/TeamGate'
import Home from './pages/Home'
import Rules from './pages/Rules'
import Register from './pages/Register'
import Signup from './pages/Signup'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import GameplayGuard from './components/gate/GameplayGuard'
import TeamDashboard from './pages/team/TeamDashboard'
import Scan from './pages/team/Scan'
import Submissions from './pages/team/Submissions'
import { Announcements, Overview } from './pages/team/TeamPlaceholders'

// Old question URL: the question now lives on the mission screen. Keep ?q= so existing links still select the question.
function KeepSearch({ to }) { const l = useLocation(); return <Navigate to={{ pathname: to, search: l.search }} replace /> }

// Players only. Organisers use the separate admin app (see /admin in the repo), which is never deployed with this site.
export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="rules" element={<Rules />} />
        <Route path="register" element={<Register />} />
        <Route path="signup" element={<Signup />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="team" element={<ProtectedRoute role="team" />}>
        <Route element={<TeamGate />}>
          <Route element={<GameplayGuard />}>
            <Route element={<TeamLayout />}>
              <Route index element={<TeamDashboard />} />
              <Route path="challenge" element={<KeepSearch to="/team" />} />
              <Route path="scan" element={<Scan />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="overview" element={<Overview />} />
              <Route path="progress" element={<Navigate to="/team/overview" replace />} />
              <Route path="*" element={<Navigate to="/team" replace />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
