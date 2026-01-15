import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { TimerProvider } from './context/TimerContext'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import MyTasks from './pages/MyTasks'
import TimeTracking from './pages/TimeTracking'
import Calendar from './pages/Calendar'
import Analytics from './pages/Analytics'
import Team from './pages/Team'
import Profile from './pages/Profile'
import ClientReview from './pages/ClientReview'

// Layout
import MainLayout from './components/layout/MainLayout'

// Protected route wrapper
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-secondary">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/review/:token" element={<ClientReview />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="time" element={<TimeTracking />} />
        <Route path="calendar" element={<Calendar />} />
        <Route
          path="analytics"
          element={
            <ProtectedRoute roles={['admin', 'pm']}>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="team"
          element={
            <ProtectedRoute roles={['admin']}>
              <Team />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <TimerProvider>
            <AppRoutes />
          </TimerProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  )
}
