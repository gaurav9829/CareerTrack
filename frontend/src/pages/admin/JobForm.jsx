import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createJob, fetchAdminJob, updateJob } from '../../api/adminApi'
import Card from '../../components/Card'
import Input from '../../components/Input'
import Textarea from '../../components/Textarea'
import Select from '../../components/Select'
import Button from '../../components/Button'
import Spinner from '../../components/Spinner'
import ErrorState from '../../components/ErrorState'
import ListInput from '../../components/ListInput'
import { useToast } from '../../context/ToastContext'
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, JOB_STATUS } from '../../utils/constants'
import { getFieldErrors, getErrorMessage } from '../../utils/format'

const blankForm = {
  title: '',
  company: '',
  location: '',
  employmentType: 'Full-time',
  experienceLevel: 'Fresher',
  salaryMin: '',
  salaryMax: '',
  description: '',
  applicationInstructions: '',
  deadline: '',
  status: 'draft',
}

// Create / edit job. Lists (responsibilities etc.) use the ListInput component.
export default function JobForm() {
  const { id } = useParams() // present => edit mode
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [lists, setLists] = useState({
    responsibilities: [''],
    qualifications: [''],
    skills: [''],
    benefits: [''],
  })
  const [errors, setErrors] = useState({})
  const [topError, setTopError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    let alive = true
    setLoading(true)
    fetchAdminJob(id)
      .then((res) => {
        if (!alive) return
        const job = res.data.job
        setForm({
          title: job.title,
          company: job.company,
          location: job.location,
          employmentType: job.employmentType || 'Full-time',
          experienceLevel: job.experienceLevel || 'Fresher',
          salaryMin: job.salary?.min ?? '',
          salaryMax: job.salary?.max ?? '',
          description: job.description,
          applicationInstructions: job.applicationInstructions || '',
          deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 10) : '',
          status: job.status,
        })
        setLists({
          responsibilities: job.responsibilities?.length ? job.responsibilities : [''],
          qualifications: job.qualifications?.length ? job.qualifications : [''],
          skills: job.skills?.length ? job.skills : [''],
          benefits: job.benefits?.length ? job.benefits : [''],
        })
      })
      .catch((err) => alive && setLoadError(getErrorMessage(err)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, isEdit])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setList = (key) => (values) => setLists((l) => ({ ...l, [key]: values }))

  function validate() {
    const map = {}
    if (!form.title.trim()) map.title = 'Title is required.'
    if (!form.company.trim()) map.company = 'Company is required.'
    if (!form.location.trim()) map.location = 'Location is required.'
    if (!form.description.trim()) map.description = 'Description is required.'
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax))
      map.salaryMax = 'Max salary must be greater than or equal to min salary.'
    return map
  }

  async function onSubmit(e) {
    e.preventDefault()
    setTopError('')
    const clientErrors = validate()
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    // Build the API payload (list fields drop empty rows).
    const clean = (arr) => arr.map((v) => v.trim()).filter(Boolean)
    const payload = {
      title: form.title.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      employmentType: form.employmentType,
      experienceLevel: form.experienceLevel,
      description: form.description.trim(),
      applicationInstructions: form.applicationInstructions.trim(),
      deadline: form.deadline || null,
      status: form.status,
      salary: {
        min: form.salaryMin ? Number(form.salaryMin) : null,
        max: form.salaryMax ? Number(form.salaryMax) : null,
        currency: 'INR',
      },
      responsibilities: clean(lists.responsibilities),
      qualifications: clean(lists.qualifications),
      skills: clean(lists.skills),
      benefits: clean(lists.benefits),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateJob(id, payload)
        toast.success('Job updated.')
      } else {
        await createJob(payload)
        toast.success('Job created as draft. Publish it when ready.')
      }
      navigate('/admin/jobs')
    } catch (err) {
      setTopError(getErrorMessage(err))
      setErrors(getFieldErrors(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Loading job…" />
  if (loadError)
    return <ErrorState title="Could not load job" message={loadError} onRetry={() => setLoadError(null)} />

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/jobs" className="text-sm font-medium text-primary-700 hover:underline">
        ← Back to jobs
      </Link>

      <Card className="mt-4 p-6">
        <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit job' : 'Post a new job'}</h1>

        {topError && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {topError}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Job title *" id="title" value={form.title} onChange={setField('title')} error={errors.title} />
            <Input label="Company *" id="company" value={form.company} onChange={setField('company')} error={errors.company} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Location *" id="location" value={form.location} onChange={setField('location')} error={errors.location} />
            <Input
              label="Application deadline"
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={setField('deadline')}
              error={errors.deadline}
              hint="Leave empty for 'open until filled'."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Employment type" id="employmentType" options={EMPLOYMENT_TYPES} value={form.employmentType} onChange={setField('employmentType')} />
            <Select label="Experience level" id="experienceLevel" options={EXPERIENCE_LEVELS} value={form.experienceLevel} onChange={setField('experienceLevel')} />
            <Select label="Status" id="status" options={JOB_STATUS} value={form.status} onChange={setField('status')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Salary min (₹ / year)"
              id="salaryMin"
              type="number"
              min="0"
              value={form.salaryMin}
              onChange={setField('salaryMin')}
              error={errors.salaryMin}
            />
            <Input
              label="Salary max (₹ / year)"
              id="salaryMax"
              type="number"
              min="0"
              value={form.salaryMax}
              onChange={setField('salaryMax')}
              error={errors.salaryMax}
            />
          </div>

          <Textarea
            label="Description *"
            id="description"
            value={form.description}
            onChange={setField('description')}
            error={errors.description}
            rows={5}
          />

          <Textarea
            label="Application instructions"
            id="applicationInstructions"
            value={form.applicationInstructions}
            onChange={setField('applicationInstructions')}
            error={errors.applicationInstructions}
            rows={2}
          />

          <ListInput label="Responsibilities" idPrefix="resp" values={lists.responsibilities} onChange={setList('responsibilities')} placeholder="e.g. Build reusable React components" />
          <ListInput label="Qualifications" idPrefix="qual" values={lists.qualifications} onChange={setList('qualifications')} placeholder="e.g. B.Tech/BCA or equivalent" />
          <ListInput label="Skills" idPrefix="skills" values={lists.skills} onChange={setList('skills')} placeholder="e.g. React" />
          <ListInput label="Benefits" idPrefix="benefits" values={lists.benefits} onChange={setList('benefits')} placeholder="e.g. Health insurance" />

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/jobs')} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-36">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create job'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
