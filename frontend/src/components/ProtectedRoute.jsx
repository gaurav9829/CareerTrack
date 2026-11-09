import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

// Wraps admin routes. Waits for the /auth/me check, then redirects to the
// login page (remembering where the user wanted to go).
export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner label="Checking session…" />

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return children
}
