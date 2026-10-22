import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

export default function RouteEffects() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    const titles = { '/': 'Make time for play', '/login': 'Demo login', '/booking': 'Book a demo session', '/dashboard': 'Customer dashboard', '/my-bookings': 'My demo bookings' }
    document.title = `${titles[pathname] ?? (pathname.startsWith('/booking/confirmation/') ? 'Demo reservation' : 'Page not found')} — Gaming Lounge`
    // Route changes need to reset the viewport independently of anchor navigation.
    if (!window.location.hash) window.scrollTo(0, 0)
    if (previousPath.current !== pathname) {
      // Move keyboard/screen-reader focus to the new page after SPA navigation.
      const main = document.getElementById('main')
      if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }) }
    }
    previousPath.current = pathname
  }, [pathname])

  return null
}
