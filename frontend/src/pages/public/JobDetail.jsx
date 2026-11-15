import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchJob } from '../../api/publicApi'
import Card from '../../components/Card'
import Spinner from '../../components/Spinner'
import ErrorState from '../../components/ErrorState'
import usePageTitle from '../../hooks/usePageTitle'
import { formatDate, formatSalary, getErrorMessage } from '../../utils/format'

// Public job detail. The API only returns ACTIVE jobs, so a 404 here means
// "draft, closed or expired" - shown as a friendly "no longer available" panel.
export default function JobDetail() {
  const { id } = useParams()
  const [state, setState] = useState({ loading: true, error: null, job: null })
  const [reloadKey, setReloadKey] = useState(0)

  usePageTitle(state.job ? `${state.job.title} at ${state.job.company}` : 'Job details')

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: null, job: null })
    fetchJob(id)
      .then((res) => alive && setState({ loading: false, error: null, job: res.data }))
      .catch((err) => alive && setState({ loading: false, error: getErrorMessage(err), job: null }))
    return () => {
      alive = false
    }
  }, [id, reloadKey])

  if (state.loading) return <Spinner label="Loading job…" />

  if (state.error) {
    return (
      <div className="py-10">
        <ErrorState
          title="This job is not available"
          message="It may have been closed, unpublished or its deadline has passed."
          onRetry={() => setReloadKey((k) => k + 1)}
        />
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm font-medium text-primary-700 hover:underline">
            ← Browse all jobs
          </Link>
        </div>
      </div>
    )
  }

  const job = state.job
  const listSection = (title, items, icon) =>
    items?.length > 0 && (
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
          <span aria-hidden="true">{icon}</span> {title}
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
    )

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm font-medium text-primary-700 hover:underline">
        ← Back to jobs
      </Link>

      <Card className="mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
            <p className="mt-1 text-slate-600">
              {job.company} · {job.location}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              {job.employmentType}
            </span>
            <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              {job.experienceLevel}
            </span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Salary</dt>
            <dd className="font-semibold text-slate-800">{formatSalary(job.salary)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Posted</dt>
            <dd className="font-semibold text-slate-800">{formatDate(job.publishedAt || job.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Deadline</dt>
            <dd className="font-semibold text-slate-800">
              {job.deadline ? formatDate(job.deadline) : 'Open until filled'}
            </dd>
          </div>
        </dl>

        <section className="mt-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">About the role</h2>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{job.description}</p>
        </section>

        {listSection('Responsibilities', job.responsibilities, '🛠️')}
        {listSection('Qualifications', job.qualifications, '🎓')}
        {listSection('Benefits', job.benefits, '🎁')}

        {job.skills?.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-base font-semibold text-slate-800">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {job.applicationInstructions && (
          <section className="mt-6 rounded-lg border border-primary-100 bg-primary-50/60 p-4 text-sm text-primary-900">
            <strong className="font-semibold">How to apply:</strong> {job.applicationInstructions}
          </section>
        )}

        <div className="mt-8 border-t border-slate-100 pt-6">
          <Link
            to={`/jobs/${job._id}/apply`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 sm:w-auto"
          >
            Apply for this job →
          </Link>
          <p className="mt-2 text-xs text-slate-500">
            You will need your résumé as PDF or DOCX (max 4 MB). No account required.
          </p>
        </div>
      </Card>
    </div>
  )
}
