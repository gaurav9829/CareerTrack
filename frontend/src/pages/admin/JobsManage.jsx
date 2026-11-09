import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteJob, fetchAdminJobs, publishJob, unpublishJob, closeJob } from '../../api/adminApi'
import Card from '../../components/Card'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import Pagination from '../../components/Pagination'
import { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../context/ToastContext'
import { JOB_STATUS } from '../../utils/constants'
import { formatDate, getErrorMessage } from '../../utils/format'
import usePageTitle from '../../hooks/usePageTitle'

const STATUS_BADGES = {
  published: 'bg-green-50 text-green-700 border-green-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  closed: 'bg-red-50 text-red-600 border-red-200',
}

// Job management table: search, status filter, pagination and all status
// actions. Destructive actions go through ConfirmModal.
export default function JobsManage() {
  usePageTitle('Manage jobs')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const [qInput, setQInput] = useState(q)
  const [state, setState] = useState({ loading: true, error: null, jobs: [], pagination: null })
  const [reloadKey, setReloadKey] = useState(0)

  // confirm state: which job + which action
  const [confirm, setConfirm] = useState(null) // { job, action: 'delete' | 'unpublish' | 'close' }
  const [busy, setBusy] = useState(false)

  // Back/forward navigation: re-sync the visible search input from the URL.
  useEffect(() => setQInput(q), [q])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (qInput !== q) {
        setSearchParams((prev) => {
          const sp = new URLSearchParams(prev)
          qInput ? sp.set('q', qInput) : sp.delete('q')
          sp.delete('page')
          return sp
        }, { replace: true })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [qInput, q, setSearchParams])

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchAdminJobs({ q, status, page, limit: 10 })
      .then((res) => alive && setState({ loading: false, error: null, jobs: res.data, pagination: res.pagination }))
      .catch((err) => alive && setState({ loading: false, error: getErrorMessage(err), jobs: [], pagination: null }))
    return () => {
      alive = false
    }
  }, [q, status, page, reloadKey])

  function updateParam(key, value) {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      if (value) sp.set(key, value)
      else sp.delete(key)
      if (key !== 'page') sp.delete('page')
      return sp
    })
  }

  async function runAction() {
    if (!confirm) return
    const { job, action } = confirm
    setBusy(true)
    try {
      if (action === 'delete') await deleteJob(job._id)
      if (action === 'unpublish') await unpublishJob(job._id)
      if (action === 'close') await closeJob(job._id)
      toast.success(
        action === 'delete' ? 'Job deleted.' : action === 'unpublish' ? 'Job unpublished (draft).' : 'Job closed.',
      )
      setConfirm(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      // e.g. delete blocked with 409 when applications exist
      toast.error(getErrorMessage(err))
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  async function doPublish(job) {
    try {
      await publishJob(job._id)
      toast.success(`"${job.title}" is now live.`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const messages = {
    delete: (job) => `Delete "${job.title}" permanently? This cannot be undone. Jobs with applications cannot be deleted.`,
    unpublish: (job) => `Unpublish "${job.title}"? It will disappear from the public site (back to draft).`,
    close: (job) => `Close "${job.title}"? It will no longer accept applications.`,
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Jobs</h1>
        <Link
          to="/admin/jobs/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New job
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="admin-job-search" className="mb-1 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              id="admin-job-search"
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Title, company or location…"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="admin-job-status" className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="admin-job-status"
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All statuses</option>
              {JOB_STATUS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {state.loading ? (
        <Spinner label="Loading jobs…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : state.jobs.length === 0 ? (
        <EmptyState
          title="No jobs match"
          message="Try clearing the search or status filter, or create a new job."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{job.title}</p>
                      <p className="text-xs text-slate-500">
                        {job.company} · {job.location} · {job.employmentType}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[job.status]}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{job.deadline ? formatDate(job.deadline) : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {job.status !== 'published' && (
                          <button type="button" onClick={() => doPublish(job)} className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                            Publish
                          </button>
                        )}
                        {job.status === 'published' && (
                          <button type="button" onClick={() => setConfirm({ job, action: 'unpublish' })} className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                            Unpublish
                          </button>
                        )}
                        {job.status !== 'closed' && (
                          <button type="button" onClick={() => setConfirm({ job, action: 'close' })} className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
                            Close
                          </button>
                        )}
                        <Link to={`/admin/jobs/${job._id}/edit`} className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                          Edit
                        </Link>
                        <button type="button" onClick={() => setConfirm({ job, action: 'delete' })} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {state.jobs.map((job) => (
              <Card key={job._id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.company} · {job.location}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[job.status]}`}>
                    {job.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.status !== 'published' && (
                    <button type="button" onClick={() => doPublish(job)} className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      Publish
                    </button>
                  )}
                  {job.status === 'published' && (
                    <button type="button" onClick={() => setConfirm({ job, action: 'unpublish' })} className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
                      Unpublish
                    </button>
                  )}
                  {job.status !== 'closed' && (
                    <button type="button" onClick={() => setConfirm({ job, action: 'close' })} className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      Close
                    </button>
                  )}
                  <Link to={`/admin/jobs/${job._id}/edit`} className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
                    Edit
                  </Link>
                  <button type="button" onClick={() => setConfirm({ job, action: 'delete' })} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            page={state.pagination.page}
            totalPages={state.pagination.totalPages}
            onChange={(p) => updateParam('page', String(p))}
          />
        </>
      )}

      {/* Confirmation for destructive actions */}
      <ConfirmModal
        open={Boolean(confirm)}
        title={
          confirm?.action === 'delete'
            ? 'Delete job?'
            : confirm?.action === 'unpublish'
              ? 'Unpublish job?'
              : 'Close job?'
        }
        message={confirm ? messages[confirm.action](confirm.job) : ''}
        confirmLabel={confirm?.action === 'delete' ? 'Delete' : 'Confirm'}
        busy={busy}
        danger={confirm?.action === 'delete'}
        onConfirm={runAction}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
