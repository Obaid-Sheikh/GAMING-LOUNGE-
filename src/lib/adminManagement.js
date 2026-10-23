import { applyCommerceOperation } from './commerceManagement.js'
import { audit, requireAdmin, transact } from './mockRepository.js'
import { validateInventory, validateStation, nextPosition, currentMaintenance, text } from './inventory.js'
import { availability, bookingCandidate, createReservation, demoReservationsForDate, formatTime, isSessionActive, localDate, overlaps, reservationBlocks, startOfSlot, extensionQuote } from './bookingRules.js'

function unresolved(state, stationId, now) {
  return state.bookings.filter((booking) => booking.stationId === stationId && ['confirmed', 'pending'].includes(booking.status) && (booking.end > now || booking.actualStart !== undefined && booking.actualEnd === undefined))
}
function operational(state, stationId) {
  const station = state.inventory.stations.find((item) => item.id === stationId)
  const zone = state.inventory.zones.find((item) => item.id === station?.zoneId)
  if (!station || station.archived || !station.active || !zone?.active || zone.archived || currentMaintenance(state.inventory, stationId)) throw new Error('The station and its zone must be active and out of maintenance.')
  return station
}
function protectBookings(state, stationId, now) {
  const conflicts = unresolved(state, stationId, now)
  if (conflicts.length) throw new Error(`Resolve ${conflicts.length} active or future reservation(s) first: ${conflicts.map((booking) => booking.id).join(', ')}. Cancel or reschedule them in Bookings; no reservation was changed.`)
}
function changedBooking(state, id) {
  if (id?.startsWith('fixture-')) throw new Error('Recurring demo fixtures are read-only. They cannot be edited or started.')
  const booking = state.bookings.find((item) => item.id === id)
  if (!booking) throw new Error('This saved reservation was not found.')
  return booking
}
function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100 }
function rateFor(booking) { return booking.hourlyRate ?? booking.gamingPrice / booking.duration }
function history(booking, action, before, now, adminId) {
  booking.history = [...(booking.history ?? []), { action, at: now, adminId, before: { stationId: before.stationId, start: before.start, end: before.end, price: before.price, status: before.status, actualStart: before.actualStart, actualEnd: before.actualEnd } }]
}

// Pure transaction operation, shared by persistence and integrity tests.
export function applyAdminOperation(state, admin, operation, now = Date.now()) {
  if (admin?.role !== 'admin') throw new Error('A demo administrator session is required.')
  if (operation.expectedRevision !== undefined && operation.expectedRevision !== state.revision) throw new Error('The lounge changed in another view. Close this form and reopen it before saving.')
  const { type, id, values = {} } = operation
  if (/^(menu|order|payment|settings)\./.test(type)) return applyCommerceOperation(state, admin, operation, now)
  if (type === 'station.save') {
    const existing = id ? state.inventory.stations.find((station) => station.id === id) : null
    if (id && !existing) throw new Error('Station not found.')
    if (existing && values.id !== existing.id) throw new Error('Station IDs cannot be changed.')
    if (!existing && state.inventory.stations.some((station) => station.id === values.id)) throw new Error('A station with this ID already exists, including archived stations.')
    const station = { ...values, archived: existing?.archived ?? false }
    if (existing && (station.zoneId !== existing.zoneId || !station.active && existing.active || unresolved(state, id, now).some((booking) => booking.gameId && !station.games?.includes(booking.gameId)))) protectBookings(state, id, now)
    const zone = state.inventory.zones.find((zone) => zone.id === station.zoneId)
    if (!zone || zone.archived || !zone.active && station.active) throw new Error('Choose an active, non-archived zone for an active station.')
    if (!station.position || station.zoneId !== existing?.zoneId) station.position = nextPosition(state.inventory, station.zoneId, id)
    if (!station.archived && state.inventory.stations.some((item) => item.id !== id && !item.archived && item.zoneId === station.zoneId && item.position.join(',') === station.position.join(','))) throw new Error('That floor position is occupied. Choose another row/column.')
    validateStation(station, state.inventory)
    if (existing) state.inventory.stations = state.inventory.stations.map((item) => item.id === id ? station : item)
    else state.inventory.stations.push(station)
    audit(state, admin, existing ? 'station.edited' : 'station.created', station.id, existing, station, now)
    if (operation.maintenanceRequested === true && !currentMaintenance(state.inventory, station.id)) applyAdminOperation(state, admin, { type: 'maintenance.start', id: station.id, values: { reason: operation.maintenanceReason } }, now)
    if (operation.maintenanceRequested === false && currentMaintenance(state.inventory, station.id)) applyAdminOperation(state, admin, { type: 'maintenance.end', id: station.id }, now)
    return station
  }
  if (type === 'station.archive' || type === 'station.restore') {
    const station = state.inventory.stations.find((item) => item.id === id)
    if (!station) throw new Error('Station not found.')
    const before = structuredClone(station)
    if (type === 'station.archive') { protectBookings(state, id, now); station.archived = true }
    else {
      if (state.inventory.zones.find((zone) => zone.id === station.zoneId)?.archived) throw new Error('Restore the zone first.')
      station.archived = false
      station.position = nextPosition(state.inventory, station.zoneId, id)
    }
    audit(state, admin, type, id, before, station, now)
    return station
  }
  if (type === 'zone.save') {
    const zone = state.inventory.zones.find((item) => item.id === id)
    if (!zone) throw new Error('Unknown zone. Stable zone IDs cannot be changed.')
    if (values.id && values.id !== id) throw new Error('Zone IDs cannot be changed.')
    if ((!values.active && zone.active) || values.archived) {
      const ids = state.inventory.stations.filter((station) => station.zoneId === id).map((station) => station.id)
      ids.forEach((stationId) => protectBookings(state, stationId, now))
      if (values.archived && state.inventory.stations.some((station) => station.zoneId === id && !station.archived)) throw new Error('Archive or reassign every station in this zone before archiving the zone.')
    }
    const before = { ...zone }
    Object.assign(zone, { name: values.name, description: values.description, active: values.active, archived: values.archived, order: values.order })
    validateInventory(state.inventory)
    audit(state, admin, 'zone.edited', id, before, zone, now)
    return zone
  }
  if (type === 'maintenance.start' || type === 'maintenance.end') {
    const station = state.inventory.stations.find((item) => item.id === id)
    if (!station || station.archived) throw new Error('Choose a non-archived station.')
    const open = currentMaintenance(state.inventory, id)
    if (type === 'maintenance.start') {
      if (open) throw new Error('This station is already under maintenance.')
      protectBookings(state, id, now)
      if (!text(values.reason, 500)) throw new Error('Enter a maintenance reason (up to 500 characters).')
      const record = { id: crypto.randomUUID(), stationId: id, reason: values.reason.trim(), startedAt: now }
      state.inventory.maintenance.push(record)
      audit(state, admin, type, id, null, record, now)
      return record
    }
    if (!open) throw new Error('This station is not under maintenance.')
    const before = { ...open }
    open.endedAt = now
    audit(state, admin, type, id, before, open, now)
    return open
  }
  if (type === 'walk-in.create') {
    if (!text(values.customerName, 100) || typeof (values.customerContact ?? '') !== 'string' || (values.customerContact ?? '').length > 150) throw new Error('Enter a customer display name and valid optional contact information.')
    const booking = { ...createReservation(values, state.bookings, 'walk-in', now, crypto.randomUUID(), state.inventory, { allowStartedSlot: true, menu: state.menu, reviewFood: state.schemaVersion === 2 }), source: 'walk-in', sessionMode: 'manual', customerName: values.customerName.trim(), customerContact: (values.customerContact ?? '').trim(), history: [] }
    if (booking.end <= now || localDate(booking.start) < localDate(now)) throw new Error('Choose a session that has not ended.')
    state.bookings.push(booking)
    audit(state, admin, type, booking.id, null, booking, now)
    return booking
  }
  const booking = changedBooking(state, id)
  const before = structuredClone(booking)
  if (type === 'booking.cancel') {
    if (!['confirmed', 'pending'].includes(booking.status) || booking.actualStart !== undefined || booking.end <= now) throw new Error('Only unstarted, unelapsed reservations can be cancelled. End an active session instead.')
    if (!text(values.reason, 500)) throw new Error('Enter a cancellation reason.')
    Object.assign(booking, { status: 'cancelled', cancelledAt: now, cancellationReason: values.reason.trim() })
  } else if (type === 'booking.reschedule') {
    if (!['confirmed', 'pending'].includes(booking.status) || booking.actualStart !== undefined || booking.end <= now) throw new Error('Only unstarted, unelapsed reservations can be rescheduled.')
    const candidate = bookingCandidate(values, state.inventory)
    const problem = availability(values, state.bookings.filter((item) => item.id !== id), now, state.inventory, { allowExtended: true })
    if (problem) throw new Error(`${problem}. Choose another station or time.`)
    const station = operational(state, values.stationId)
    if (booking.gameId && !station.games.includes(booking.gameId)) throw new Error('The new station does not support the selected game. Choose a compatible station.')
    const hourlyRate = station.id === booking.stationId ? rateFor(booking) : station.rate
    const gamingPrice = round(hourlyRate * candidate.duration)
    Object.assign(booking, { ...candidate, gameId: booking.gameId ?? '', hourlyRate, addOns: before.addOns, foodSubtotal: before.foodSubtotal, gamingPrice, price: round(gamingPrice + before.foodSubtotal), sessionMode: 'manual' })
  } else if (type === 'session.start') {
    if (booking.status !== 'confirmed' || booking.actualStart !== undefined || now < booking.start || now >= booking.end) throw new Error('Start a confirmed, unstarted session during its scheduled interval.')
    operational(state, booking.stationId)
    const others = [...state.bookings.filter((item) => item.id !== id), ...demoReservationsForDate(localDate(now), state.inventory)]
    if (others.some((item) => item.stationId === booking.stationId && (isSessionActive(item, now) || reservationBlocks(item) && overlaps(now, booking.end, item)))) throw new Error('Another active session or reservation conflicts with this start.')
    booking.actualStart = now
    booking.sessionMode = 'manual'
  } else if (type === 'session.end') {
    if (booking.status !== 'confirmed' || booking.actualStart === undefined || booking.actualEnd !== undefined) throw new Error('Record the session start before ending an active session.')
    Object.assign(booking, { actualEnd: now, status: 'completed' })
  } else if (type === 'session.extend') {
    if (booking.status !== 'confirmed' || booking.actualEnd !== undefined || booking.end <= now && booking.actualStart === undefined) throw new Error('Only an active or eligible upcoming confirmed session can be extended.')
    operational(state, booking.stationId)
    const end = startOfSlot(localDate(booking.start), values.endHour)
    const duration = (end - booking.start) / 3600000
    if (!Number.isFinite(end) || end <= booking.end || end <= now) throw new Error('Choose a new end time after the current end and current time.')
    const hour = Number(formatTime(booking.start).slice(0, 2))
    const problem = availability({ stationId: booking.stationId, date: localDate(booking.start), hour, duration }, state.bookings.filter((item) => item.id !== id), now, state.inventory, { allowStartedSlot: true, allowExtended: true })
    if (problem) throw new Error(`${problem}. The extension cannot be applied.`)
    Object.assign(booking, extensionQuote(booking, values.endHour))
  } else throw new Error('Unknown admin operation.')
  history(booking, type, before, now, admin.id)
  audit(state, admin, type, id, before, booking, now)
  return booking
}

export function runAdmin(operation) {
  return transact((state) => applyAdminOperation(state, requireAdmin(), operation, Date.now()))
}
export { unresolved }
