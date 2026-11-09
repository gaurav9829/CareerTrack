import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchStats } from '../../api/adminApi'
import Card from '../../components/Card'
import Spinner from '../../components/Spinner'
import ErrorState from '../../components/ErrorState'
import usePageTitle from '../../hooks/usePageTitle'
import { APPLICATION_STATUS } from '../../utils/constants'
import { getErrorMessage } from '../../utils/format'

// Dashboard: headline stat cards + applications broken down by status.
export default function Dashboard() {
  usePageTitle('Dashboard')
  const [state, setState] = useState({ loading: true, error: null, stats: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchStats()
      .then((res) => alive && setState({ loading: false, error: null, stats: res.data }))
      .catch((err) => alive && setState({ loading: false, error: getErrorMessage(err), stats: null }))
    return () => {
      alive = false
    }
  }, [reloadKey])

  if (state.loading) return <Spinner label="Loading stats…" />
  if (state.error) return <ErrorState message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />

  const stats = state.stats
  const cards = [
    { label: 'Total jobs', value: stats.totalJobs, to: '/admin/jobs' },
    { label: 'Active jobs', value: stats.activeJobs, to: '/admin/jobs?status=published' },
    { label: 'Expired jobs', value: stats.expiredJobs, to: '/admin/jobs?status=published' },
    { label: 'Drafts', value: stats.draftJobs, to: '/admin/jobs?status=draft' },
    { label: 'Closed jobs', value: stats.closedJobs, to: '/admin/jobs?status=closed' },
    { label: 'Total applications', value: stats.totalApplications, to: '/admin/applications' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <Link
          to="/admin/jobs/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Post a job
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to}>
            <Card className="p-5 transition hover:border-primary-300 hover:shadow-md">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{card.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold text-slate-800">Applications by status</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {APPLICATION_STATUS.map((status) => (
            <div key={status} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-slate-800">
                {stats.applicationsByStatus?.[status] || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">{status}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
