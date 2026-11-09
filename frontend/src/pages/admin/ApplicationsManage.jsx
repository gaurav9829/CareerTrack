import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { exportCsvUrl, fetchApplications, fetchAdminJobs } from '../../api/adminApi'
import Card from '../../components/Card'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import Pagination from '../../components/Pagination'
import { APPLICATION_STATUS } from '../../utils/constants'
import { formatDate, statusBadgeClass, getErrorMessage } from '../../utils/format'
import Badge from '../../components/Badge'

// Applications table: filter by job/status/date range, search, CSV export.
export default function ApplicationsManage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const job = searchParams.get('job') || ''
  const status = searchParams.get('status') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const q = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const [jobs, setJobs] = useState([]) // for the job filter dropdown
  const [state, setState] = useState({ loading: true, error: null, applications: [], pagination: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // Job dropdown: one page with a high limit is enough for a demo-scale DB.
    fetchAdminJobs({ limit: 50, sort: 'title' })
      .then((res) => setJobs(res.data))
      .catch(() => setJobs([]))
  }, [reloadKey])

  const filters = { job, status, from, to, q, page, limit: 10 }

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchApplications(filters)
      .then((res) => alive && setState({ loading: false, error: null, applications: res.data, pagination: res.pagination }))
      .catch((err) => alive && setState({ loading: false, error: getErrorMessage(err), applications: [], pagination: null }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, status, from, to, q, page, reloadKey])

  function updateParam(key, value) {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      if (value) sp.set(key, value)
      else sp.delete(key)
      if (key !== 'page') sp.delete('page')
      return sp
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Applications</h1>
        {/* CSV export honors the current filters */}
        <a
          href={exportCsvUrl(filters)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬇ Export CSV
        </a>
      </div>

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="fltr-job" className="mb-1 block text-sm font-medium text-slate-700">Job</label>
            <select
              id="fltr-job"
              value={job}
              onChange={(e) => updateParam('job', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All jobs</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>{j.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fltr-status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              id="fltr-status"
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All statuses</option>
              {APPLICATION_STATUS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fltr-from" className="mb-1 block text-sm font-medium text-slate-700">From</label>
            <input
              id="fltr-from"
              type="date"
              value={from}
              onChange={(e) => updateParam('from', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="fltr-to" className="mb-1 block text-sm font-medium text-slate-700">To</label>
            <input
              id="fltr-to"
              type="date"
              value={to}
              onChange={(e) => updateParam('to', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="fltr-q" className="mb-1 block text-sm font-medium text-slate-700">Search</label>
            <input
              id="fltr-q"
              type="search"
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Name or email…"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </Card>

      {state.loading ? (
        <Spinner label="Loading applications…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : state.applications.length === 0 ? (
        <EmptyState title="No applications found" message="Try clearing the filters." />
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.applications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{app.name}</p>
                      <p className="text-xs text-slate-500">{app.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {app.job ? (
                        <>
                          {app.job.title}
                          <span className="block text-xs text-slate-400">{app.job.company}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(app.status)}>{app.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(app.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/applications/${app._id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Pagination
            page={state.pagination.page}
            totalPages={state.pagination.totalPages}
            onChange={(p) => updateParam('page', String(p))}
          />
        </>
      )}
    </div>
  )
}
