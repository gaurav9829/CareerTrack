import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addApplicationNote,
  fetchApplication,
  resumeUrl,
  updateApplicationStatus,
} from '../../api/adminApi'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import Spinner from '../../components/Spinner'
import ErrorState from '../../components/ErrorState'
import { useToast } from '../../context/ToastContext'
import { APPLICATION_STATUS } from '../../utils/constants'
import { formatDate, formatDateTime, statusBadgeClass, getErrorMessage } from '../../utils/format'
import usePageTitle from '../../hooks/usePageTitle'

// Single application: candidate details, résumé download, status control, notes.
export default function ApplicationDetail() {
  const { id } = useParams()
  const toast = useToast()
  usePageTitle('Review application')

  const [state, setState] = useState({ loading: true, error: null, app: null })
  const [reloadKey, setReloadKey] = useState(0)
  const [statusBusy, setStatusBusy] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchApplication(id)
      .then((res) => alive && setState({ loading: false, error: null, app: res.data }))
      .catch((err) => alive && setState({ loading: false, error: getErrorMessage(err), app: null }))
    return () => {
      alive = false
    }
  }, [id, reloadKey])

  async function onStatusChange(e) {
    const status = e.target.value
    setStatusBusy(true)
    try {
      await updateApplicationStatus(id, status)
      toast.success(`Status updated to ${status}.`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setStatusBusy(false)
    }
  }

  async function onAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setNoteBusy(true)
    try {
      await addApplicationNote(id, noteText.trim())
      setNoteText('')
      toast.success('Note added.')
      setReloadKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setNoteBusy(false)
    }
  }

  if (state.loading) return <Spinner label="Loading application…" />
  if (state.error)
    return <ErrorState title="Could not load application" message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />

  const app = state.app

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/applications" className="text-sm font-medium text-primary-700 hover:underline">
        Back to applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{app.name}</h1>
          <p className="text-sm text-slate-500">
            Applied {formatDateTime(app.createdAt)} for{' '}
            {app.job ? (
              <>
                <strong className="text-slate-700">{app.job.title}</strong> ({app.job.company})
              </>
            ) : (
              'a deleted job'
            )}
          </p>
        </div>
        <Badge className={statusBadgeClass(app.status)}>{app.status}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Contact + résumé */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-800">Contact</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd>
                <a href={`mailto:${app.email}`} className="font-medium text-primary-700 hover:underline">
                  {app.email}
                </a>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-800">{app.phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Experience</dt>
              <dd className="font-medium text-slate-800">{app.experience?.years || 0} year(s)</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.open(resumeUrl(app._id), '_blank', 'noopener')}
            >
              Download résumé
            </Button>
            {app.resume?.originalName && (
              <p className="mt-2 text-xs text-slate-400">
                Original file: {app.resume.originalName} ({(app.resume.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {/* Status control */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <label htmlFor="status-select" className="mb-1 block text-sm font-medium text-slate-700">
              Update status
            </label>
            <select
              id="status-select"
              value={app.status}
              disabled={statusBusy}
              onChange={onStatusChange}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {APPLICATION_STATUS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Profile */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-800">Profile</h2>

          {app.skills?.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Skills</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {app.skills.map((s) => (
                  <span key={s} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {app.education?.length > 0 && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Education</p>
              <ul className="mt-1 space-y-1 text-sm text-slate-600">
                {app.education.map((edu, i) => (
                  <li key={i}>
                    <strong className="text-slate-800">{edu.degree || '—'}</strong>
                    {edu.institution ? ` · ${edu.institution}` : ''}
                    {edu.year ? ` · ${edu.year}` : ''}
                  </li>
                ))}
              </ul>
            </>
          )}

          {app.experience?.summary && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Experience summary</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{app.experience.summary}</p>
            </>
          )}

          {app.coverLetter && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Cover letter</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{app.coverLetter}</p>
            </>
          )}
        </Card>
      </div>

      {/* Internal notes */}
      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold text-slate-800">Internal notes</h2>
        <p className="text-xs text-slate-400">Only visible to admins — never shown to candidates.</p>

        <ul className="mt-4 space-y-3">
          {app.notes?.length === 0 && <li className="text-sm text-slate-500">No notes yet.</li>}
          {app.notes?.map((note, i) => (
            <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm text-slate-700">{note.text}</p>
              <p className="mt-1 text-xs text-slate-400">
                {note.author?.name || 'Admin'} · {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>

        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onAddNote}>
          <label htmlFor="new-note" className="sr-only">Add a note</label>
          <input
            id="new-note"
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Strong React portfolio, schedule screening call"
            maxLength={2000}
            className="block flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          />
          <Button type="submit" disabled={noteBusy || !noteText.trim()}>
            {noteBusy ? 'Adding…' : 'Add note'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
