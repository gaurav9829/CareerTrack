// Centered loading spinner. `label` is announced to screen readers.
export default function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-16 ${className}`} role="status">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"
      />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}
