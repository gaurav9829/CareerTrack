import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ScrollToTop from '../components/ScrollToTop'
import { getErrorMessage } from '../utils/format'

// Shell for all /admin pages: sidebar navigation (top bar on mobile) + logout.
export default function AdminLayout() {
  const { admin, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const linkClass = ({ isActive }) =>
    `block rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-blue-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
    }`

  async function onLogout() {
    try {
      await logout()
      toast.success('Logged out.')
      navigate('/admin/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 lg:flex-row">
      <ScrollToTop />
      {/* Sidebar - plain white like the rest of the app */}
      <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r lg:w-60 lg:shrink-0">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" width="26" height="26" />
            <span className="text-base font-bold text-slate-800">CareerTrack</span>
            <span className="rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 lg:hidden"
          >
            Logout
          </button>
        </div>

        <nav className="space-y-1 px-3 pb-4 lg:mt-2" aria-label="Admin navigation">
          <NavLink to="/admin" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/jobs" className={linkClass}>
            Jobs
          </NavLink>
          <NavLink to="/admin/applications" className={linkClass}>
            Applications
          </NavLink>
          <Link to="/" className="block rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            ↗ View public site
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center justify-end border-b border-slate-200 bg-white px-6 py-3 lg:flex">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              Signed in as <strong className="text-slate-800">{admin?.name}</strong>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
