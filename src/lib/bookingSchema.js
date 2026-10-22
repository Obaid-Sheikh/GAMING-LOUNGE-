import { defaultInventory, finiteMoney, unique } from './inventory.js'
export const addOnSubtotal = (items = []) => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
export const validAddOns = (items) => Array.isArray(items) && items.every((item) => item && typeof item.id === 'string' && typeof item.name === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 && finiteMoney(item.unitPrice)) && unique(items.map((item) => item.id))
export function normalizeBooking(booking) {
  const addOns = booking.addOns ?? []
  const foodSubtotal = addOnSubtotal(addOns)
  return { ...booking, ...(booking.paymentStatus === 'paid' ? { paidAmount: booking.paidAmount ?? booking.price } : {}), addOns, foodSubtotal, gamingPrice: booking.gamingPrice ?? booking.price - foodSubtotal }
}
export function validBookings(value, inventory = defaultInventory()) {
  return Array.isArray(value) && compatibleIntervals(value) && unique(value.map((item) => item?.id)) && value.every((item) => item && typeof item.id === 'string' && item.id.length > 0 && !item.id.startsWith('fixture-') && item.fixture !== true && typeof item.userId === 'string'
    && inventory.stations.some((station) => station.id === item.stationId) && inventory.zones.some((zone) => zone.id === item.zoneId)
    && ['confirmed', 'pending', 'cancelled', 'completed'].includes(item.status)
    && Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start && Number.isFinite(item.createdAt)
    && Number.isInteger(item.duration) && item.duration >= 1 && item.duration <= 12 && item.end - item.start === item.duration * 3600000
    && finiteMoney(item.price) && (item.addOns === undefined || validAddOns(item.addOns))
    && (item.gamingPrice === undefined || (finiteMoney(item.gamingPrice) && Math.abs(item.price - item.gamingPrice - addOnSubtotal(item.addOns ?? [])) < 0.001))
    && (item.foodSubtotal === undefined || Math.abs(item.foodSubtotal - addOnSubtotal(item.addOns ?? [])) < 0.001)
    && (item.paidAmount === undefined || finiteMoney(item.paidAmount))
    && (item.hourlyRate === undefined || finiteMoney(item.hourlyRate))
    && (item.actualStart === undefined || Number.isFinite(item.actualStart) && item.actualStart >= item.start && ['confirmed', 'completed'].includes(item.status))
    && (item.actualEnd === undefined || (Number.isFinite(item.actualEnd) && Number.isFinite(item.actualStart) && item.actualEnd >= item.actualStart))
    && (item.status !== 'cancelled' || Number.isFinite(item.cancelledAt))
    && (item.status !== 'completed' || Number.isFinite(item.actualEnd))
    && (item.actualEnd === undefined || item.status === 'completed')
    && (item.sessionMode === undefined || item.sessionMode === 'manual')
    && (item.source === undefined || ['customer', 'walk-in'].includes(item.source))
    && (item.customerName === undefined || (typeof item.customerName === 'string' && item.customerName.length <= 100))
    && (item.customerContact === undefined || (typeof item.customerContact === 'string' && item.customerContact.length <= 150))
    && (item.history === undefined || (Array.isArray(item.history) && item.history.every((event) => event && typeof event.action === 'string' && Number.isFinite(event.at)))))
}

function compatibleIntervals(bookings) {
  const blocks = (booking) => booking && (['confirmed', 'pending'].includes(booking.status) || booking.status === 'completed' && booking.actualEnd !== undefined)
  for (let i = 0; i < bookings.length; i++) for (let j = i + 1; j < bookings.length; j++) {
    const a = bookings[i], b = bookings[j]
    if (!a || !b || a.stationId !== b.stationId) continue
    if (blocks(a) && blocks(b) && a.start < b.end && a.end > b.start) return false
    if (Number.isFinite(a.actualStart) && Number.isFinite(b.actualStart) && a.actualStart < (b.actualEnd ?? Infinity) && b.actualStart < (a.actualEnd ?? Infinity)) return false
  }
  return true
}
