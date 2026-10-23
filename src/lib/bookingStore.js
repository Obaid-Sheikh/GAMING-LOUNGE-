import { AUTH_KEY, readStored } from './demoStorage.js'
import { cancelReservation, createReservation } from './bookingRules.js'
import { readRepository, transact } from './mockRepository.js'
export const readBookings = () => readRepository().bookings
function requireSession(userId) {
  const session = readStored(AUTH_KEY, null, (value) => typeof value?.id === 'string')
  if (!session || session.id !== userId || session.id === 'demo-admin') throw new Error('Your demo session has ended. Sign in again to continue.')
}
export function updateBookings(action) {
  return transact((state) => {
    const { bookings, result } = action(state.bookings, state.inventory, state.menu)
    state.bookings = bookings
    return result
  })
}
export function reserveDemo(input, userId) {
  return updateBookings((previous, inventory, menu) => {
    requireSession(userId)
    const result = { ...createReservation(input, previous, userId, Date.now(), crypto.randomUUID(), inventory, { menu, reviewFood: true }), sessionMode: 'manual', source: 'customer', history: [] }
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
