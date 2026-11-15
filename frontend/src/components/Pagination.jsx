// Page-number pagination. Keeps Prev/Next plus up to 7 numbered buttons.
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const maxButtons = 7
  let start = Math.max(1, page - Math.floor(maxButtons / 2))
  const end = Math.min(totalPages, start + maxButtons - 1)
  start = Math.max(1, end - maxButtons + 1)
  for (let p = start; p <= end; p += 1) pages.push(p)

  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Prev
      </button>
      {start > 1 && <span className="px-1 text-slate-400">…</span>}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
          className={`min-w-9 rounded-md border px-3 py-1.5 text-sm ${
            p === page
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span className="px-1 text-slate-400">…</span>}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  )
}
