// Friendly empty state with an optional call-to-action.
export default function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <svg
        aria-hidden="true"
        className="mb-4 h-12 w-12 text-slate-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 13.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5m0 0v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4m-14 0h4.25a2 2 0 0 0 1.9 1.375h1.7a2 2 0 0 0 1.9-1.375H20"
        />
      </svg>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
