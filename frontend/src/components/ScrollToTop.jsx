import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router keeps scroll position across navigations; public expectation is
// "new page starts at the top". Scroll up whenever the route path changes.
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
