import { Link } from 'react-router-dom'
import { formatDate, formatSalary } from '../utils/format'

// One job row on the public listing.
export default function JobCard({ job }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            <Link to={`/jobs/${job._id}`} className="hover:text-primary-700">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {job.company} · {job.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            {job.employmentType}
          </span>
          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
            {job.experienceLevel}
          </span>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-600">{job.description}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span className="font-medium text-slate-700">{formatSalary(job.salary)}</span>
        <span>
          Posted {formatDate(job.createdAt)}
          {job.deadline ? ` · Apply by ${formatDate(job.deadline)}` : ' · Open until filled'}
        </span>
        <Link
          to={`/jobs/${job._id}`}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
        >
          View &amp; Apply
        </Link>
      </div>
    </article>
  )
}
