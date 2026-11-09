import { useEffect } from 'react'

// Sets the browser tab title per page (and restores a default for unnamed pages).
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | CareerTrack` : 'CareerTrack | Job Portal'
  }, [title])
}
