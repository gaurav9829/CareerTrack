// Small formatting helpers used across pages.

// "₹4,50,000 – ₹7,00,000" style, Indian numbering.
export function formatSalary(salary) {
  if (!salary || (!salary.min && !salary.max)) return 'Salary not disclosed'
  const fmt = (n) => new Intl.NumberFormat('en-IN').format(n)
  const prefix = salary.currency === 'INR' ? '₹' : `${salary.currency} `
  if (salary.min && salary.max) return `${prefix}${fmt(salary.min)} – ${prefix}${fmt(salary.max)}`
  if (salary.min) return `${prefix}${fmt(salary.min)}+`
  return `Up to ${prefix}${fmt(salary.max)}`
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isDeadlinePassed(deadline) {
  return Boolean(deadline && new Date(deadline) < new Date())
}

// Consistent colors per status, shared by tables and badges.
const STATUS_COLORS = {
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  Shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  'Interview Scheduled': 'bg-purple-50 text-purple-700 border-purple-200',
  Selected: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
}

export function statusBadgeClass(status) {
  return STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200'
}

// Pull a human-friendly message out of an axios error (server sends
// { success:false, message }) or fall back sensibly.
export function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  )
}

// Field-level errors from the server's standard { errors: [{field,message}] }.
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors
  if (!Array.isArray(errors)) return {}
  return errors.reduce((map, e) => {
    if (e?.field && !map[e.field]) map[e.field] = e.message
    return map
  }, {})
}
