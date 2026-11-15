// Labeled list of text inputs with add/remove - used for responsibilities,
// qualifications, skills and benefits on the job form.
import Input from './Input'

export default function ListInput({ label, idPrefix, values, onChange, placeholder }) {
  const update = (index, value) => onChange(values.map((v, i) => (i === index ? value : v)))

  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-slate-700">{label}</legend>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-${index}`}
              aria-label={`${label} item ${index + 1}`}
              value={value}
              placeholder={placeholder}
              onChange={(e) => update(index, e.target.value)}
            />
            <button
              type="button"
              aria-label={`Remove ${label} item ${index + 1}`}
              disabled={values.length === 1}
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ''])}
        className="mt-2 text-sm font-medium text-primary-700 hover:underline"
      >
        + Add item
      </button>
    </fieldset>
  )
}
