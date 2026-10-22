import { DEMO_USER, stations, stationMaintenance } from '../data/bookingCatalog.js'
import { demoReservationsForDate, localDate, normalizeBooking } from './bookingRules.js'

export const operatingStates = ['Available', 'Reserved', 'Occupied', 'Maintenance']
export const equipmentName = (station) => ({ playstation: 'PlayStation console', xbox: 'Xbox console', pc: 'Gaming PC', entertainment: 'Private screening room' })[station.zoneId]
export const paymentStatus = (booking) => ['paid', 'pending', 'refunded', 'failed'].includes(booking?.paymentStatus) ? booking.paymentStatus : 'unknown'
export const foodStatus = (booking) => ['pending', 'preparing', 'fulfilled', 'cancelled'].includes(booking?.foodOrderStatus) ? booking.foodOrderStatus : 'unknown'
export const customerName = (booking) => booking.customerName || (booking.userId === DEMO_USER.id ? DEMO_USER.name : 'Unknown demo customer')
export const remainingMinutes = (booking, now) => Math.max(0, Math.ceil((booking.end - now) / 60000))
export const foodQuantity = (booking) => (booking?.addOns ?? []).reduce((sum, item) => sum + item.quantity, 0)

export function operationalSnapshot(bookings, now = Date.now()) {
  const date = localDate(now)
  const records = [...bookings.map(normalizeBooking), ...demoReservationsForDate(date)]
  const stationViews = stations.map((station) => {
    const maintenance = stationMaintenance.find((item) => item.stationId === station.id)
    const reservations = records.filter((booking) => booking.stationId === station.id && ['confirmed', 'pending'].includes(booking.status) && booking.end > now).sort((a, b) => a.start - b.start)
    const active = reservations.find((booking) => booking.status === 'confirmed' && booking.start <= now)
    const upcoming = reservations.find((booking) => booking.start > now)
    const pending = reservations.find((booking) => booking.status === 'pending' && booking.start <= now)
    const status = maintenance || !station.active ? 'Maintenance' : active ? 'Occupied' : pending || (upcoming && localDate(upcoming.start) === date) ? 'Reserved' : 'Available'
    return { station, maintenance, status, active, upcoming, booking: active ?? pending ?? upcoming }
  })
  const today = records.filter((booking) => localDate(booking.start) === date)
  const valid = records.filter((booking) => booking.status !== 'cancelled')
  const counts = Object.fromEntries(operatingStates.map((status) => [status, stationViews.filter((view) => view.status === status).length]))
  return {
    date, records, stationViews, counts,
    todayBookings: today.length,
    pendingPayments: valid.filter((booking) => paymentStatus(booking) === 'pending').length,
    revenue: records.filter((booking) => paymentStatus(booking) === 'paid' && Number.isFinite(booking.paidAt) && booking.paidAt <= now && localDate(booking.paidAt) === date).reduce((sum, booking) => sum + booking.price, 0),
    recent: [...records].filter((booking) => booking.createdAt <= now).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    upcoming: valid.filter((booking) => booking.start > now).sort((a, b) => a.start - b.start).slice(0, 5),
    foodOrders: valid.filter((booking) => foodQuantity(booking) > 0 && ['pending', 'preparing'].includes(foodStatus(booking))),
    attention: stationViews.filter((view) => view.status === 'Maintenance' || paymentStatus(view.active) === 'pending'),
  }
}
