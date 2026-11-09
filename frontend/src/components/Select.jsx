// Labeled select with inline error. Options: array of strings OR {value,label}.
export default function Select({ label, id, error, options = [], placeholder, className = '', ...rest }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        id={id}
        aria-invalid={Boolean(error)}
        className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ),
        )}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
