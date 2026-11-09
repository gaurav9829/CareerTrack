import { useEffect, useState } from 'react'

// Returns `value` after it has stayed unchanged for `delay` ms.
// Used to avoid firing an API request on every keystroke in search inputs.
export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
