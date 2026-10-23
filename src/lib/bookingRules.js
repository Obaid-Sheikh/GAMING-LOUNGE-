import { readInventory, readRepository } from './mockRepository.js'
import { currentMaintenance } from './inventory.js'
import { addOnSubtotal, validAddOns } from './bookingSchema.js'
export { addOnSubtotal, validAddOns, validBookings, normalizeBooking } from './bookingSchema.js'
import { foodItems } from '../data/foodCatalog.js'
import { BOOKING_WINDOW_DAYS, CLOSE_HOUR, DEMO_TIME_ZONE, DURATIONS, OPEN_HOUR, reservationFixtures } from '../data/bookingCatalog.js'

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

export function bookingCandidate({ stationId, date, hour, duration, addOns = [], gameId = '' }, inventory = readInventory()) {
  const station = inventory.stations.find((item) => item.id === stationId)
  const start = startOfSlot(date, hour)
  const gamingPrice = Math.round(((station?.rate ?? 0) * duration + Number.EPSILON) * 100) / 100
  const foodSubtotal = addOnSubtotal(addOns)
  return { stationId, zoneId: station?.zoneId, start, end: start + duration * 3600000, duration, gameId, addOns, hourlyRate: station?.rate ?? 0, stationName: station?.name, zoneName: inventory.zones.find((zone) => zone.id === station?.zoneId)?.name, gamingPrice, foodSubtotal, price: gamingPrice + foodSubtotal }
}

export function availability(input, bookings, now = Date.now(), inventory = readInventory(), options = {}) {
  const station = inventory.stations.find((item) => item.id === input.stationId)
  if (!station) return 'Choose a station'
  if (currentMaintenance(inventory, station.id)) return 'Maintenance'
  if (!station.active || station.archived || !inventory.zones.some((zone) => zone.id === station.zoneId && zone.active && !zone.archived)) return 'Station or zone inactive'
  const periodProblem = sessionProblem(input, now, options)
  if (periodProblem) return periodProblem
  const { start, end } = bookingCandidate(input, inventory)
  const reservations = [...bookings, ...demoReservationsForDate(input.date, inventory)]
  const conflict = reservations.find((booking) => booking.stationId === station.id && reservationBlocks(booking) && (overlaps(start, end, booking) || (booking.actualStart !== undefined && booking.actualEnd === undefined && start <= now && booking.actualStart < end)))
  if (conflict) return conflict.status === 'pending' ? 'Pending' : conflict.fixture ? 'Demo occupied' : 'Reserved in this browser'
  return ''
}

export function createReservation(input, bookings, userId, now = Date.now(), id = crypto.randomUUID(), inventory = readInventory(), options = {}) {
  if (!userId) throw new Error('Sign in to create a demo booking.')
  const problem = availability(input, bookings, now, inventory, options)
  if (problem) throw new Error(`${problem}. Choose another station or time.`)
  const station = inventory.stations.find((item) => item.id === input.stationId)
  if (input.gameId && !station.games.includes(input.gameId)) throw new Error('Choose a supported game.')
  const addOns = snapshotAddOns(input.addOns ?? [], options.menu ?? readRepository().menu, options.reviewFood)
  return { ...bookingCandidate({ ...input, addOns }, inventory), id, userId, status: 'confirmed', createdAt: now }
}

export function cancelReservation(booking, userId, now = Date.now()) {
  if (!booking || booking.userId !== userId) throw new Error('This demo booking is not available to this customer.')
  if (booking.status !== 'confirmed' || booking.start <= now) throw new Error('Only upcoming confirmed demo bookings can be cancelled.')
  return { ...booking, status: 'cancelled', cancelledAt: now }
}

export function bookingStatus(booking, now = Date.now()) {
  if (booking.status === 'cancelled') return 'Cancelled'
  if (booking.status === 'completed' || booking.actualEnd !== undefined || booking.end <= now && booking.actualStart === undefined) return 'Completed'
  if (booking.actualStart !== undefined) return 'In progress'
  if (booking.status === 'pending') return 'Pending'
  if (booking.sessionMode === 'manual') return booking.start <= now ? 'Awaiting start' : 'Upcoming'
  if (booking.start <= now) return 'In progress'
  return 'Upcoming'
}

export function snapshotAddOns(items, menu = readRepository().menu, reviewFood = false) {
  if (!validAddOns(items)) throw new Error('Invalid food selection.')
  return items.map((item) => {
    const product = menu.find((product) => product.id === item.id)
    if (!product || product.archived || !product.available) throw new Error('This food item is unavailable. Edit your food selection.')
    if (reviewFood && (item.unitPrice !== product.price || item.name !== product.name)) throw new Error('The food menu changed. Reopen food selection and review the current prices before saving.')
    return { id: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price }
  })
}

export function stationStatus(input, bookings, now, inventory = readInventory()) {
  const reason = availability(input, bookings, now, inventory)
  if (!reason) return 'Available'
  if (reason === 'Station or zone inactive') return 'Unavailable'
  if (reason === 'Maintenance' || reason === 'Pending') return reason
  if (['Demo occupied', 'Reserved in this browser'].includes(reason)) return 'Booked'
  return 'Choose period'
}

export function sessionProblem(input, now = Date.now(), options = {}) {
  if (!(options.allowExtended ? Number.isInteger(input.duration) && input.duration >= 1 && input.duration <= CLOSE_HOUR - OPEN_HOUR : DURATIONS.includes(input.duration))) return 'Choose a valid duration'
  const start = startOfSlot(input.date, input.hour)
  if (!Number.isFinite(start) || input.date < localDate(now) || input.date > localDate(now, BOOKING_WINDOW_DAYS)) return 'Choose a date within the next 30 days'
  if (input.hour < OPEN_HOUR || input.hour + input.duration > CLOSE_HOUR) return 'Outside demo hours'
  if (!options.allowStartedSlot && start <= now) return 'Time has passed'
  return ''
}

// Shared read-only expansion: fixture IDs are date-specific and never seeded into storage.
export function demoReservationsForDate(date, inventory = readInventory()) {
  return reservationFixtures.map((fixture, index) => {
    const addOns = (fixture.foodIds ?? []).map((id) => {
      const item = foodItems.find((item) => item.id === id)
      return { id, name: item.name, unitPrice: item.price, quantity: 1 }
    })
    const candidate = bookingCandidate({ ...fixture, date, addOns }, inventory)
    const hourlyRate = fixture.hourlyRate ?? candidate.hourlyRate
    const gamingPrice = Math.round(hourlyRate * fixture.duration * 100) / 100
    return { ...candidate, hourlyRate, gamingPrice, price: gamingPrice + candidate.foodSubtotal, id: `fixture-${date}-${index}`, userId: 'demo-fixture', customerName: 'Demo fixture (unassigned)', status: fixture.status, fixture: true, createdAt: startOfSlot(date, 10), paymentStatus: fixture.paymentStatus ?? 'unknown', paidAt: fixture.paymentStatus === 'paid' ? startOfSlot(date, 10) : undefined, foodOrderStatus: fixture.foodOrderStatus ?? 'unknown' }
  })
}

export const reservationBlocks = (booking) => ['confirmed', 'pending'].includes(booking.status) || (booking.status === 'completed' && booking.actualEnd !== undefined)
export const isSessionActive = (booking, now) => booking.status === 'confirmed' && booking.actualEnd === undefined && (booking.actualStart !== undefined && booking.actualStart <= now || (booking.sessionMode !== 'manual' && booking.start <= now && booking.end > now))

export function extensionQuote(booking, endHour) {
  const end = startOfSlot(localDate(booking.start), endHour)
  const duration = (end - booking.start) / 3600000
  const hourlyRate = booking.hourlyRate ?? booking.gamingPrice / booking.duration
  const gamingPrice = Math.round((hourlyRate * duration + Number.EPSILON) * 100) / 100
  return { end, duration, hourlyRate, gamingPrice, price: Math.round((gamingPrice + booking.foodSubtotal + Number.EPSILON) * 100) / 100 }
}
