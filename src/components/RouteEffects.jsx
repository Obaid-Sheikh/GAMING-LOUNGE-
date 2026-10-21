import { useEffect } from 'react'
import { useLocation } from 'react-router'

export default function RouteEffects() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = pathname === '/' ? 'Gaming Lounge — Make time for play' : pathname === '/booking' ? 'Booking coming soon — Gaming Lounge' : 'Page not found — Gaming Lounge'
    // Route changes need to reset the viewport independently of anchor navigation.
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [pathname])

  return null
}
