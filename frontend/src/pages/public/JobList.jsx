import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchJobs } from '../../api/publicApi'
import useDebounce from '../../hooks/useDebounce'
import JobCard from '../../components/JobCard'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import Pagination from '../../components/Pagination'
import { getErrorMessage } from '../../utils/format'
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, SORT_OPTIONS } from '../../utils/constants'

// Public job listing. All filter/sort/page state lives in the URL query string
// so refresh and browser-back keep working. Text inputs are debounced.
export default function JobList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const location = searchParams.get('location') || ''
  const type = searchParams.get('type') || ''
  const level = searchParams.get('level') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  // Local input state + debounce: the URL only updates when typing settles.
  const [qInput, setQInput] = useState(q)
  const [locationInput, setLocationInput] = useState(location)
  const debouncedQ = useDebounce(qInput)
  const debouncedLocation = useDebounce(locationInput)

  useEffect(() => {
    if (debouncedQ === q && debouncedLocation === location) return
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      debouncedQ ? sp.set('q', debouncedQ) : sp.delete('q')
      debouncedLocation ? sp.set('location', debouncedLocation) : sp.delete('location')
      sp.delete('page') // new search => back to page 1
      return sp
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, debouncedLocation])

  const params = useMemo(
    () => ({ q, location, type, level, sort, page, limit: 9 }),
    [q, location, type, level, sort, page],
  )

  const [state, setState] = useState({ loading: true, error: null, jobs: [], pagination: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchJobs(params)
      .then((res) => alive && setState({ loading: false, error: null, jobs: res.data, pagination: res.pagination }))
      .catch((err) => alive && setState({ loading: false, error: getErrorMessage(err), jobs: [], pagination: null }))
    return () => {
      alive = false
    }
  }, [params, reloadKey])

  // Update one URL param; any filter change resets to page 1.
  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      if (value) sp.set(key, value)
      else sp.delete(key)
      if (key !== 'page') sp.delete('page')
      return sp
    })
  }

  const hasFilters = q || location || type || level

  return (
    <div>
      {/* Page intro */}
      <section className="mb-6 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-6 py-10 text-center text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">Find your next role</h1>
        <p className="mt-2 text-sm text-primary-100">
          Browse open positions and apply with your résumé — no account needed.
        </p>
      </section>

      {/* Search + filters */}
      <section aria-label="Search and filters" className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="job-search" className="mb-1 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              id="job-search"
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Job title, company or location…"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="job-location" className="mb-1 block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              id="job-location"
              type="search"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="e.g. Bengaluru, Remote…"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="job-type" className="mb-1 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              id="job-type"
              value={type}
              onChange={(e) => updateParam('type', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All types</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="job-level" className="mb-1 block text-sm font-medium text-slate-700">
              Experience
            </label>
            <select
              id="job-level"
              value={level}
              onChange={(e) => updateParam('level', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All levels</option>
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="job-sort" className="mb-1 block text-sm font-medium text-slate-700">
              Sort by
            </label>
            <select
              id="job-sort"
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Results */}
      {state.loading ? (
        <Spinner label="Loading jobs…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : state.jobs.length === 0 ? (
        <EmptyState
          title="No jobs found"
          message={hasFilters ? 'Try changing your search or clearing the filters.' : 'Check back soon — new openings are posted regularly.'}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {state.pagination.total} job{state.pagination.total === 1 ? '' : 's'} found
            {state.pagination.totalPages > 1 && ` · page ${state.pagination.page} of ${state.pagination.totalPages}`}
          </p>
          <div className="flex flex-col gap-4">
            {state.jobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
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
