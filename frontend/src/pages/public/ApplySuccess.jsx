import { Link, useLocation } from 'react-router-dom'
import Card from '../../components/Card'

// Confirmation page after a successful application.
export default function ApplySuccess() {
  const location = useLocation()
  const { jobTitle, company } = location.state || {}

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="p-8 text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
        >
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">Application submitted!</h1>

        <p className="mt-3 text-sm text-slate-600">
          {jobTitle ? (
            <>
              Thank you for applying to <strong>{jobTitle}</strong>
              {company ? ` at ${company}` : ''}. The team will review your application and reach
              out at the email you provided.
            </>
          ) : (
            'Thank you for applying. The team will review your application and reach out at the email you provided.'
          )}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          You cannot apply to the same job twice with the same email.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Browse more jobs
          </Link>
        </div>
      </Card>
    </div>
  )
}
