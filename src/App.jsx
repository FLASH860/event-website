import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import PublicLayout from './components/PublicLayout'
import TeamLayout from './components/TeamLayout'
import AdminLayout from './components/AdminLayout'
import Home from './pages/Home'
import Rules from './pages/Rules'
import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'
import GameplayGuard from './components/gate/GameplayGuard'
import TeamDashboard from './pages/team/TeamDashboard'
import Scan from './pages/team/Scan'
import { Announcements, Overview } from './pages/team/TeamPlaceholders'
import { AdminHome, Rounds, Checkpoints, AdminSubmissions, Results, AdminAnnouncements } from './pages/admin/AdminPages'
import Questions from './pages/admin/Questions'
import Audit from './pages/admin/Audit'
import Submissions from './pages/team/Submissions'
import Teams from './pages/admin/Teams'

// Old question URL: the question now lives on the mission screen. Keep ?q= so existing links still select the question.
function KeepSearch({ to }) { const l = useLocation(); return <Navigate to={{ pathname: to, search: l.search }} replace /> }

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="rules" element={<Rules />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login audience="team" />} />
        <Route path="login/admin" element={<Login audience="admin" />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="team" element={<ProtectedRoute role="team" />}>
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

      <Route path="admin" element={<ProtectedRoute role="admin" />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="teams" element={<Teams />} />
          <Route path="rounds" element={<Rounds />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="questions" element={<Questions />} />
          <Route path="challenges" element={<Navigate to="/admin/questions" replace />} />
          <Route path="checkpoints" element={<Checkpoints />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="results" element={<Results />} />
          <Route path="audit" element={<Audit />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
