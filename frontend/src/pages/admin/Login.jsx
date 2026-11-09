import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Input from '../../components/Input'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { getErrorMessage } from '../../utils/format'

// Admin login. On success the backend sets the httpOnly cookie and the
// AuthContext stores the admin object.
export default function Login() {
  const { admin, loading, login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Already logged in? Straight to the dashboard.
  if (!loading && admin) return <Navigate to="/admin" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      toast.success('Welcome back!')
      navigate(location.state?.from || '/admin', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <img src="/favicon.svg" alt="" width="40" height="40" className="mx-auto" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate-500">CareerTrack recruitment console</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Accounts are created by the administrator seed script only.
        </p>
      </Card>
    </div>
  )
}
