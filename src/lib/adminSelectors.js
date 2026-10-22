import { readInventory } from './mockRepository.js'
import { currentMaintenance } from './inventory.js'
import { DEMO_USER } from '../data/bookingCatalog.js'
import { demoReservationsForDate, localDate, normalizeBooking, isSessionActive } from './bookingRules.js'

export const operatingStates = ['Available', 'Reserved', 'Occupied', 'Maintenance']
export const equipmentName = (station) => station.equipment ?? ({ playstation: 'PlayStation console', xbox: 'Xbox console', pc: 'Gaming PC', entertainment: 'Private screening room' })[station.zoneId]
export const paymentStatus = (booking) => ['paid', 'pending', 'refunded', 'failed'].includes(booking?.paymentStatus) ? booking.paymentStatus : 'unknown'
export const foodStatus = (booking) => ['pending', 'preparing', 'fulfilled', 'cancelled'].includes(booking?.foodOrderStatus) ? booking.foodOrderStatus : 'unknown'
export const customerName = (booking) => booking.customerName || (booking.userId === DEMO_USER.id ? DEMO_USER.name : 'Unknown demo customer')
export const remainingMinutes = (booking, now) => Math.max(0, Math.ceil((booking.end - now) / 60000))
export const foodQuantity = (booking) => (booking?.addOns ?? []).reduce((sum, item) => sum + item.quantity, 0)

export function operationalSnapshot(bookings, now = Date.now(), inventory = readInventory()) {
  const date = localDate(now)
  const records = [...bookings.map(normalizeBooking), ...demoReservationsForDate(date, inventory)]
  const stationViews = inventory.stations.filter((station) => !station.archived && !inventory.zones.find((zone) => zone.id === station.zoneId)?.archived).map((station) => {
    const maintenance = currentMaintenance(inventory, station.id)
    const reservations = records.filter((booking) => booking.stationId === station.id && (['confirmed', 'pending'].includes(booking.status) || booking.status === 'completed' && booking.actualEnd !== undefined) && (booking.end > now || isSessionActive(booking, now))).sort((a, b) => a.start - b.start)
    const active = reservations.find((booking) => isSessionActive(booking, now))
    const upcoming = reservations.find((booking) => booking.start > now)
    const pending = reservations.find((booking) => booking.start <= now && !isSessionActive(booking, now))
    const status = maintenance ? 'Maintenance' : !station.active || !inventory.zones.find((zone) => zone.id === station.zoneId)?.active ? 'Inactive' : active ? 'Occupied' : pending || (upcoming && localDate(upcoming.start) === date) ? 'Reserved' : 'Available'
    return { station, maintenance, status, active, upcoming, booking: active ?? pending ?? upcoming }
  })
  const inactiveCount = stationViews.filter((view) => view.status === 'Inactive').length
  const today = records.filter((booking) => localDate(booking.start) === date)
  const valid = records.filter((booking) => booking.status !== 'cancelled')
  const counts = Object.fromEntries(operatingStates.map((status) => [status, stationViews.filter((view) => view.status === status).length]))
  if (inactiveCount) counts.Inactive = inactiveCount
  return {
    date, records, stationViews, counts, inventory,
    todayBookings: today.length,
    pendingPayments: valid.filter((booking) => paymentStatus(booking) === 'pending').length,
    revenue: records.filter((booking) => paymentStatus(booking) === 'paid' && Number.isFinite(booking.paidAt) && booking.paidAt <= now && localDate(booking.paidAt) === date).reduce((sum, booking) => sum + (booking.paidAmount ?? booking.price), 0),
    recent: [...records].filter((booking) => booking.createdAt <= now).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    upcoming: valid.filter((booking) => booking.start > now).sort((a, b) => a.start - b.start).slice(0, 5),
    foodOrders: valid.filter((booking) => foodQuantity(booking) > 0 && ['pending', 'preparing'].includes(foodStatus(booking))),
    attention: stationViews.filter((view) => ['Maintenance', 'Inactive'].includes(view.status) || paymentStatus(view.active) === 'pending'),
  }
}
