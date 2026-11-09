import { createContext, useCallback, useContext, useState } from 'react'

// Minimal toast system: showToast.success('...') / showToast.error('...').
const ToastContext = createContext(null)

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type, message) => {
      const id = nextId++
      setToasts((list) => [...list, { id, type, message }])
      setTimeout(() => remove(id), 4200)
    },
    [remove],
  )

  const showToast = {
    success: (msg) => push('success', msg),
    error: (msg) => push('error', msg),
    info: (msg) => push('info', msg),
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Toast container: fixed, top-right, stacked, accessible via role=status */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${
              t.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : t.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
