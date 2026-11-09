import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchJob, submitApplication } from '../../api/publicApi'
import Card from '../../components/Card'
import Input from '../../components/Input'
import Textarea from '../../components/Textarea'
import Button from '../../components/Button'
import Spinner from '../../components/Spinner'
import ErrorState from '../../components/ErrorState'
import { getFieldErrors, getErrorMessage } from '../../utils/format'

const ALLOWED_EXTENSIONS = ['.pdf', '.docx']
const MAX_RESUME_MB = 4 // must match backend MAX_RESUME_MB

const emptyEducationRow = () => ({ degree: '', institution: '', year: '' })

const initialState = {
  name: '',
  email: '',
  phone: '',
  experienceYears: '',
  experienceSummary: '',
  skills: '',
  coverLetter: '',
}

// Application form: public, multipart/form-data, with client-side checks that
// mirror the server rules. Server errors are mapped back onto the fields.
export default function ApplyForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [job, setJob] = useState(null)
  const [jobError, setJobError] = useState(null)
  const [jobLoading, setJobLoading] = useState(true)

  const [form, setForm] = useState(initialState)
  const [education, setEducation] = useState([emptyEducationRow()])
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState({})
  const [topError, setTopError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let alive = true
    setJobLoading(true)
    fetchJob(id)
      .then((res) => alive && setJob(res.data))
      .catch((err) => alive && setJobError(getErrorMessage(err)))
      .finally(() => alive && setJobLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setEducationRow = (index, key, value) =>
    setEducation((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))

  function validateFile(selected) {
    if (!selected) return 'Please attach your résumé.'
    const ext = selected.name.slice(selected.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Only PDF or DOCX files are allowed.'
    if (selected.size > MAX_RESUME_MB * 1024 * 1024) return `File must be smaller than ${MAX_RESUME_MB} MB.`
    return ''
  }

  function onFileChange(e) {
    const selected = e.target.files?.[0] || null
    const err = selected ? validateFile(selected) : ''
    setFileError(err)
    setFile(selected)
  }

  function validate() {
    const map = {}
    if (form.name.trim().length < 2) map.name = 'Please enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) map.email = 'Please enter a valid email address.'
    if (!/^\+?[0-9][0-9\s-]{6,14}$/.test(form.phone.trim())) map.phone = 'Please enter a valid phone number.'
    if (form.experienceYears && (Number(form.experienceYears) < 0 || Number(form.experienceYears) > 50))
      map.experienceYears = 'Years of experience must be between 0 and 50.'
    if (form.coverLetter.length > 5000) map.coverLetter = 'Cover letter must be 5000 characters or fewer.'
    if (!file) map.resume = fileError || 'Please attach your résumé (PDF or DOCX).'
    else if (fileError) map.resume = fileError
    return map
  }

  async function onSubmit(e) {
    e.preventDefault()
    setTopError('')

    const clientErrors = validate()
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    // multipart/form-data: flat string fields; education travels as JSON.
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => data.append(key, value))
    const cleanEducation = education
      .filter((row) => row.degree || row.institution)
      .map((row) => ({ ...row, year: row.year ? Number(row.year) : undefined }))
    data.append('education', JSON.stringify(cleanEducation))
    data.append('resume', file)

    setSubmitting(true)
    setProgress(0)
    try {
      const res = await submitApplication(id, data, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
      })
      navigate(`/jobs/${id}/apply/success`, {
        state: { jobTitle: res.data?.jobTitle, company: res.data?.company },
      })
    } catch (err) {
      setTopError(getErrorMessage(err))
      setErrors(getFieldErrors(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (jobLoading) return <Spinner label="Preparing application…" />

  if (jobError || !job) {
    return (
      <div className="py-10">
        <ErrorState
          title="You cannot apply to this job"
          message={jobError || 'It may have been closed, unpublished or its deadline has passed.'}
        />
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm font-medium text-primary-700 hover:underline">
            ← Browse all jobs
          </Link>
        </div>
      </div>
    )
  }

  const inputCls = 'block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500'

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/jobs/${id}`} className="text-sm font-medium text-primary-700 hover:underline">
        ← Back to job
      </Link>

      <Card className="mt-4 p-6">
        <h1 className="text-xl font-bold text-slate-900">Apply — {job.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {job.company} · {job.location}
        </p>

        {topError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {topError}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name *"
              id="name"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={setField('name')}
              error={errors.name}
            />
            <Input
              label="Email *"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={setField('email')}
              error={errors.email}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone *"
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={setField('phone')}
              error={errors.phone}
            />
            <Input
              label="Years of experience"
              id="experienceYears"
              name="experienceYears"
              type="number"
              min="0"
              max="50"
              value={form.experienceYears}
              onChange={setField('experienceYears')}
              error={errors.experienceYears}
            />
          </div>

          <Input
            label="Skills (comma separated)"
            id="skills"
            name="skills"
            placeholder="React, Node.js, MongoDB"
            value={form.skills}
            onChange={setField('skills')}
            error={errors.skills}
          />

          <Textarea
            label="Experience summary"
            id="experienceSummary"
            value={form.experienceSummary}
            onChange={setField('experienceSummary')}
            error={errors.experienceSummary}
            rows={3}
          />

          {/* Education rows (optional) */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Education</legend>
            <div className="space-y-3">
              {education.map((row, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-start">
                  <input
                    aria-label={`Degree ${index + 1}`}
                    placeholder="Degree (e.g. B.Tech CSE)"
                    className={inputCls}
                    value={row.degree}
                    onChange={(e) => setEducationRow(index, 'degree', e.target.value)}
                  />
                  <input
                    aria-label={`Institution ${index + 1}`}
                    placeholder="Institution"
                    className={inputCls}
                    value={row.institution}
                    onChange={(e) => setEducationRow(index, 'institution', e.target.value)}
                  />
                  <input
                    aria-label={`Graduation year ${index + 1}`}
                    placeholder="Year"
                    type="number"
                    min="1970"
                    max="2100"
                    className={inputCls}
                    value={row.year}
                    onChange={(e) => setEducationRow(index, 'year', e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove education row ${index + 1}`}
                    disabled={education.length === 1}
                    onClick={() => setEducation((rows) => rows.filter((_, i) => i !== index))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEducation((rows) => [...rows, emptyEducationRow()])}
              className="mt-2 text-sm font-medium text-primary-700 hover:underline"
            >
              + Add education
            </button>
          </fieldset>

          <Textarea
            label="Cover letter"
            id="coverLetter"
            value={form.coverLetter}
            onChange={setField('coverLetter')}
            error={errors.coverLetter}
            rows={5}
            hint="Optional — tell the team why you are a good fit."
          />

          {/* Résumé upload */}
          <div>
            <label htmlFor="resume" className="mb-1 block text-sm font-medium text-slate-700">
              Résumé * <span className="font-normal text-slate-500">(PDF or DOCX, max {MAX_RESUME_MB} MB)</span>
            </label>
            <input
              ref={fileInputRef}
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,.docx"
              onChange={onFileChange}
              aria-invalid={Boolean(errors.resume || fileError)}
              className={`block w-full cursor-pointer rounded-lg border px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 ${
                errors.resume || fileError ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {(errors.resume || fileError) && (
              <p className="mt-1 text-xs text-red-600">{errors.resume || fileError}</p>
            )}
            {file && !fileError && (
              <p className="mt-1 text-xs text-green-700">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {/* Upload progress */}
          {submitting && progress > 0 && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Uploading… {progress}%</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/jobs/${id}`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-40">
              {submitting ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
