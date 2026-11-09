// Labeled textarea with inline error.
export default function Textarea({ label, id, error, className = '', rows = 4, ...rest }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
