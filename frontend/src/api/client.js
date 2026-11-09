import axios from 'axios'

// Single axios instance for the whole app.
// withCredentials: the JWT lives in an httpOnly cookie, so every request must
// carry cookies. The Vite proxy (dev) / vercel.json rewrite (prod) makes this
// same-origin, so the cookie stays first-party.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
})

// The AuthContext registers a callback so a 401 anywhere clears the session.
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) onUnauthorized(error)
    return Promise.reject(error)
  },
)

export default client
