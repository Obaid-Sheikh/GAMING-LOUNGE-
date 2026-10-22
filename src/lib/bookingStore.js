import { AUTH_KEY, BOOKINGS_KEY, readStored, writeStored } from './demoStorage.js'
import { cancelReservation, createReservation, normalizeBooking, validBookings } from './bookingRules.js'

export const readBookings = () => readStored(BOOKINGS_KEY, [], validBookings).map(normalizeBooking)

function requireSession(userId) {
  const session = readStored(AUTH_KEY, null, (value) => typeof value?.id === 'string')
  if (!session || session.id !== userId) throw new Error('Your demo session has ended. Sign in again to continue.')
}

export async function updateBookings(action) {
  // Serialize cooperating tabs on the same browser origin where Web Locks is supported.
  // The synchronous fallback only protects the current tab, never a real booking system.
  const update = () => {
    const previous = readBookings()
    const { bookings, result } = action(previous)
    writeStored(BOOKINGS_KEY, bookings)
    window.dispatchEvent(new Event('demo-bookings-changed'))
    return result
  }
  return navigator.locks ? navigator.locks.request(BOOKINGS_KEY, update) : update()
}

export function reserveDemo(input, userId) {
  return updateBookings((previous) => {
    requireSession(userId)
    const result = createReservation(input, previous, userId)
    return { bookings: [...previous, result], result }
  })
}

export function cancelDemo(id, userId) {
  return updateBookings((previous) => {
    requireSession(userId)
    const result = cancelReservation(previous.find((booking) => booking.id === id), userId)
    return { bookings: previous.map((booking) => booking.id === id ? result : booking), result }
  })
}
