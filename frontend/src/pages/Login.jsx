import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

export default function Login() {
  const navigate = useNavigate()
  const { user, login, loading } = useAuth()
  const { showToast } = useNotifications()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already logged in
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      showToast('Welcome back!', 'success')
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <span className="font-bold text-3xl text-text-primary">Foxhole</span>
          </div>
          <p className="text-text-secondary mt-2">Enterprise OS for Creative Agencies</p>
        </div>

        {/* Login form */}
        <div className="card">
          <h1 className="text-xl font-semibold text-text-primary mb-6">Sign in to your account</h1>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              loading={submitting}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-text-secondary mb-3">Demo accounts:</p>
            <div className="space-y-2 text-sm">
              <p className="text-text-primary">
                <span className="text-text-secondary">Admin:</span> admin@neofoxmedia.com
              </p>
              <p className="text-text-primary">
                <span className="text-text-secondary">PM:</span> pm@neofoxmedia.com
              </p>
              <p className="text-text-primary">
                <span className="text-text-secondary">Employee:</span> arun@neofoxmedia.com
              </p>
              <p className="text-text-secondary">
                Password for all: <code className="bg-surface-secondary px-1 rounded">password123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
