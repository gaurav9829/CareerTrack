import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

// Header + footer for all public pages.
export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            <span className="text-lg font-bold text-slate-800">CareerTrack</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
            <NavLink to="/" end className={navClass}>
              Find Jobs
            </NavLink>
            <Link
              to="/admin/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-600"
              title="Admin area"
            >
              Admin
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-slate-100 bg-white px-4 py-2 sm:hidden" aria-label="Mobile navigation">
            <NavLink to="/" end className={navClass} onClick={() => setMenuOpen(false)}>
              Find Jobs
            </NavLink>
            <Link
              to="/admin/login"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </Link>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} CareerTrack — demo project with fictional data.</p>
          <p>
            Built with React, Node.js, Express &amp; MongoDB. Résumés are validated and only
            visible to admins.
          </p>
        </div>
      </footer>
    </div>
  )
}
