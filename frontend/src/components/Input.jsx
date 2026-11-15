// Labeled input with inline error. Every input gets a real <label> (a11y).
export default function Input({ label, id, error, hint, className = '', ...rest }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={Boolean(error)}
        className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
