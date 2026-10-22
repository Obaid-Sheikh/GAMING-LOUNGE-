import { DEMO_USER } from '../data/bookingCatalog.js'

export const DEMO_ADMIN = { id: 'demo-admin', name: 'Demo Administrator', email: 'admin@example.test', role: 'admin' }
export function resolveDemoSession(session) {
  if (session?.id === DEMO_USER.id) return { ...DEMO_USER, role: 'customer' }
  if (session?.id === DEMO_ADMIN.id) return DEMO_ADMIN
  return null
}
export function loginDestination(requested, role) {
  const fallback = role === 'admin' ? '/admin' : '/dashboard'
  if (typeof requested !== 'string') return fallback
  if (/^\/admin(?:\/[a-z0-9-]+)*(?:[?#].*)?$/.test(requested)) return role === 'admin' ? requested : '/admin'
  if (/^\/(booking(?:\/confirmation\/[^/?#]+)?|dashboard|my-bookings)(?:[?#].*)?$/.test(requested)) return role === 'customer' ? requested : fallback
  return fallback
}
