import { createContext, useContext, useEffect, useState } from 'react'
import { fetchMe, login as apiLogin, logout as apiLogout } from '../api/adminApi'
import { setUnauthorizedHandler } from '../api/client'

// Holds the logged-in admin. Restores the session on page load by calling
// /auth/me (the httpOnly cookie proves who we are - no token in JS storage).
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMe()
      .then((res) => setAdmin(res.data))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false))
  }, [])

  // Any 401 from the API (expired session etc.) clears the auth state.
  useEffect(() => {
    setUnauthorizedHandler(() => setAdmin(null))
  }, [])

  const login = async (email, password) => {
    const res = await apiLogin(email, password)
    setAdmin(res.data)
    return res
  }

  const logout = async () => {
    try {
      await apiLogout()
    } finally {
      setAdmin(null)
    }
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
