// Error panel with retry. Used whenever an API call fails.
export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-red-800">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-red-600">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      )}
    </div>
  )
}
