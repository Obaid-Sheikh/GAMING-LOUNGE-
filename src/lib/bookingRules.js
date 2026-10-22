import { foodItems } from '../data/foodCatalog.js'
import { BOOKING_WINDOW_DAYS, CLOSE_HOUR, DEMO_TIME_ZONE, DURATIONS, OPEN_HOUR, reservationFixtures, stationMaintenance, stations } from '../data/bookingCatalog.js'

export function localDate(now = Date.now(), days = 0) {
  const date = new Date(now + days * 86400000)
  const parts = new Intl.DateTimeFormat('en', { timeZone: DEMO_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = (type) => parts.find((item) => item.type === type).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function startOfSlot(date, hour) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour)) return NaN
  const start = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00+05:30`)
  return Number.isFinite(start) && localDate(start) === date ? start : NaN
}

export const overlaps = (start, end, other) => start < other.end && end > other.start
export const formatTime = (timestamp) => new Intl.DateTimeFormat('en-IN', { timeZone: DEMO_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)
export const formatDate = (timestamp) => new Intl.DateTimeFormat('en-IN', { timeZone: DEMO_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(timestamp)

export function bookingCandidate({ stationId, date, hour, duration, addOns = [], gameId = '' }) {
  const station = stations.find((item) => item.id === stationId)
  const start = startOfSlot(date, hour)
  const gamingPrice = (station?.rate ?? 0) * duration
  const foodSubtotal = addOnSubtotal(addOns)
  return { stationId, zoneId: station?.zoneId, start, end: start + duration * 3600000, duration, gameId, addOns, gamingPrice, foodSubtotal, price: gamingPrice + foodSubtotal }
}

export function availability(input, bookings, now = Date.now()) {
  const station = stations.find((item) => item.id === input.stationId)
  if (!station) return 'Choose a station'
  if (!station.active || stationMaintenance.some((item) => item.stationId === station.id)) return 'Maintenance'
  const periodProblem = sessionProblem(input, now)
  if (periodProblem) return periodProblem
  const { start, end } = bookingCandidate(input)
  const reservations = [...bookings, ...reservationFixtures.map((fixture) => ({ ...fixture, start: startOfSlot(input.date, fixture.hour), end: startOfSlot(input.date, fixture.hour + fixture.duration), fixture: true }))]
  const conflict = reservations.find((booking) => booking.stationId === station.id && ['confirmed', 'pending'].includes(booking.status) && overlaps(start, end, booking))
  if (conflict) return conflict.status === 'pending' ? 'Pending' : conflict.fixture ? 'Demo occupied' : 'Reserved in this browser'
  return ''
}

export function createReservation(input, bookings, userId, now = Date.now(), id = crypto.randomUUID()) {
  if (!userId) throw new Error('Sign in to create a demo booking.')
  const problem = availability(input, bookings, now)
  if (problem) throw new Error(`${problem}. Choose another station or time.`)
  const station = stations.find((item) => item.id === input.stationId)
  if (input.gameId && !station.games.includes(input.gameId)) throw new Error('Choose a supported game.')
  const addOns = snapshotAddOns(input.addOns ?? [])
  return { ...bookingCandidate({ ...input, addOns }), id, userId, status: 'confirmed', createdAt: now }
}

export function cancelReservation(booking, userId, now = Date.now()) {
  if (!booking || booking.userId !== userId) throw new Error('This demo booking is not available to this customer.')
  if (booking.status !== 'confirmed' || booking.start <= now) throw new Error('Only upcoming confirmed demo bookings can be cancelled.')
  return { ...booking, status: 'cancelled', cancelledAt: now }
}

export function bookingStatus(booking, now = Date.now()) {
  if (booking.status === 'cancelled') return 'Cancelled'
  if (booking.end <= now) return 'Completed'
  if (booking.start <= now) return 'In progress'
  return 'Upcoming'
}

export function validBookings(value) {
  return Array.isArray(value) && value.every((item) => item && typeof item.id === 'string' && typeof item.userId === 'string'
    && stations.some((station) => station.id === item.stationId && station.zoneId === item.zoneId)
    && ['confirmed', 'pending', 'cancelled'].includes(item.status)
    && Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start
    && Number.isFinite(item.createdAt) && DURATIONS.includes(item.duration)
    && item.end - item.start === item.duration * 3600000 && Number.isFinite(item.price) && item.price >= 0
    && (item.addOns === undefined || validAddOns(item.addOns))
    && (item.status !== 'cancelled' || Number.isFinite(item.cancelledAt)))
    && new Set(value.map((item) => item.id)).size === value.length
}

export const addOnSubtotal = (items = []) => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
export const validAddOns = (items) => Array.isArray(items) && items.every((item) => item && typeof item.id === 'string' && typeof item.name === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 && Number.isFinite(item.unitPrice) && item.unitPrice >= 0) && new Set(items.map((item) => item.id)).size === items.length

export function snapshotAddOns(items) {
  if (!validAddOns(items)) throw new Error('Invalid food selection.')
  return items.map((item) => {
    const product = foodItems.find((product) => product.id === item.id)
    if (!product) throw new Error('This food item is unavailable.')
    return { id: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price }
  })
}

export function normalizeBooking(booking) {
  const addOns = booking.addOns ?? []
  const foodSubtotal = addOnSubtotal(addOns)
  return { ...booking, addOns, foodSubtotal, gamingPrice: booking.gamingPrice ?? booking.price - foodSubtotal }
}

export function stationStatus(input, bookings, now) {
  const reason = availability(input, bookings, now)
  if (!reason) return 'Available'
  if (reason === 'Maintenance' || reason === 'Pending') return reason
  if (['Demo occupied', 'Reserved in this browser'].includes(reason)) return 'Booked'
  return 'Choose period'
}

export function sessionProblem(input, now = Date.now()) {
  if (!DURATIONS.includes(input.duration)) return 'Choose a valid duration'
  const { start } = bookingCandidate(input)
  if (!Number.isFinite(start) || input.date < localDate(now) || input.date > localDate(now, BOOKING_WINDOW_DAYS)) return 'Choose a date within the next 30 days'
  if (input.hour < OPEN_HOUR || input.hour + input.duration > CLOSE_HOUR) return 'Outside demo hours'
  if (start <= now) return 'Time has passed'
  return ''
}
