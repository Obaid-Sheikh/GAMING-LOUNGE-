import test from 'node:test'
import assert from 'node:assert/strict'
import { availability, bookingCandidate, bookingStatus, cancelReservation, createReservation, localDate, overlaps, startOfSlot, validBookings, stationStatus, normalizeBooking, addOnSubtotal } from './bookingRules.js'

const now = Date.parse('2030-01-01T03:00:00Z')
const input = { stationId: 'ps-01', date: '2030-01-02', hour: 14, duration: 2 }
const make = (patch = {}, rows = [], user = 'customer-a') => createReservation({ ...input, ...patch }, rows, user, now, 'reservation-1')

test('stores IST session times as UTC and snapshots the demo estimate', () => {
  const booking = make()
  assert.equal(new Date(booking.start).toISOString(), '2030-01-02T08:30:00.000Z')
  assert.equal(new Date(booking.end).toISOString(), '2030-01-02T10:30:00.000Z')
  assert.equal(booking.price, 400)
  assert.equal(booking.zoneId, 'playstation')
  assert.equal(validBookings([booking]), true)
})

test('uses the lounge calendar across UTC midnight', () => {
  assert.equal(localDate(Date.parse('2030-01-01T20:00:00Z')), '2030-01-02')
  assert.equal(startOfSlot('2030-02-30', 14), NaN)
})

test('rejects partial, contained, enclosing, and identical overlapping sessions', () => {
  const existing = make()
  for (const patch of [{ hour: 13 }, { hour: 15 }, { hour: 14, duration: 1 }, { hour: 13, duration: 3 }, {}]) {
    assert.throws(() => make(patch, [existing]), /Reserved in this browser/)
  }
})

test('allows adjacent intervals and the same times on a different resource', () => {
  const existing = make()
  assert.equal(availability({ ...input, hour: 16 }, [existing], now), '')
  assert.equal(availability({ ...input, stationId: 'ps-03' }, [existing], now), '')
  assert.equal(overlaps(existing.end, existing.end + 3600000, existing), false)
})

test('rejects demo occupied periods including durations that cross them', () => {
  assert.match(availability({ ...input, hour: 11 }, [], now), /Demo occupied/)
  assert.match(availability({ ...input, hour: 12, duration: 1 }, [], now), /Demo occupied/)
  assert.equal(availability({ ...input, hour: 10 }, [], now), '')
  assert.equal(availability({ ...input, hour: 13 }, [], now), '')
})

test('rejects maintenance, invalid stations, and unsigned-in booking attempts', () => {
  assert.throws(() => make({ stationId: 'pc-02' }), /Maintenance/)
  assert.throws(() => make({ stationId: 'unknown' }), /Choose a station/)
  assert.throws(() => make({}, [], null), /Sign in/)
})

test('validates dates, booking horizon, duration, hourly starts, and closing time', () => {
  for (const patch of [{ date: '' }, { date: '2029-12-31' }, { date: '2030-02-01' }, { date: '2030-02-30' }, { duration: 0 }, { duration: 1.5 }, { duration: 4 }, { hour: 9 }, { hour: 20, duration: 3 }, { hour: 14.5 }, { hour: null }]) {
    assert.throws(() => make(patch))
  }
  assert.equal(availability({ ...input, date: '2030-01-31' }, [], now), '')
  assert.equal(availability({ ...input, hour: 21, duration: 1 }, [], now), '')
})

test('rechecks a session that became stale before confirmation', () => {
  const later = startOfSlot(input.date, input.hour)
  assert.throws(() => createReservation(input, [], 'customer-a', later, 'id'), /Time has passed/)
})

test('cancellation releases availability and is restricted to the owner before start', () => {
  const booking = make()
  assert.throws(() => cancelReservation(booking, 'customer-b', now), /not available/)
  assert.throws(() => cancelReservation(booking, 'customer-a', booking.start), /Only upcoming/)
  const cancelled = cancelReservation(booking, 'customer-a', now)
  assert.equal(availability(input, [cancelled], now), '')
  assert.equal(validBookings([cancelled]), true)
  assert.throws(() => cancelReservation(cancelled, 'customer-a', now), /Only upcoming/)
})

test('represents private entertainment as an exclusive group resource', () => {
  const booking = make({ stationId: 'room-01' })
  assert.equal(booking.price, 700)
  assert.throws(() => make({ stationId: 'room-01' }, [booking], 'customer-b'), /Reserved/)
})

test('derives upcoming, in-progress, completed, and cancelled status', () => {
  const booking = make()
  assert.equal(bookingStatus(booking, now), 'Upcoming')
  assert.equal(bookingStatus(booking, booking.start), 'In progress')
  assert.equal(bookingStatus(booking, booking.end), 'Completed')
  assert.equal(bookingStatus(cancelReservation(booking, 'customer-a', now), booking.end), 'Cancelled')
})

test('fails closed on malformed or duplicate stored reservations', () => {
  const booking = make()
  for (const rows of [null, {}, [null], [booking, booking], [{ ...booking, stationId: 'invalid' }], [{ ...booking, end: booking.start }], [{ ...booking, status: 'cancelled' }], [{ ...booking, price: '400' }]]) {
    assert.equal(validBookings(rows), false)
  }
  assert.equal(validBookings([]), true)
  assert.equal(Number.isNaN(bookingCandidate({ ...input, date: '' }).start), true)
})


test('all four zones have multiple stable stations', async () => {
  const { stations } = await import('../data/bookingCatalog.js')
  assert.equal(new Set(stations.map((item) => item.id)).size, stations.length)
  for (const zone of ['playstation', 'xbox', 'pc', 'entertainment']) assert.ok(stations.filter((item) => item.zoneId === zone).length >= 2)
})

test('derives all station statuses and recalculates date, time and duration', () => {
  assert.equal(stationStatus(input, [], now), 'Available')
  assert.equal(stationStatus({ ...input, hour: 12 }, [], now), 'Booked')
  assert.equal(stationStatus({ ...input, stationId: 'ps-02' }, [], now), 'Pending')
  assert.equal(stationStatus({ ...input, stationId: 'pc-02' }, [], now), 'Maintenance')
  const booking = make()
  assert.equal(stationStatus(input, [booking], now), 'Booked')
  assert.equal(stationStatus({ ...input, date: '2030-01-03' }, [booking], now), 'Available')
  assert.equal(stationStatus({ ...input, hour: 16 }, [booking], now), 'Available')
  assert.equal(stationStatus({ ...input, hour: 10, duration: 3 }, [], now), 'Booked')
  assert.throws(() => make({ stationId: 'ps-02' }), /Pending/)
  assert.throws(() => make({}, [{ ...booking, status: 'pending' }]), /Pending/)
})

test('snapshots menu prices and totals, rejects invalid quantities, supports skipping', () => {
  const addOns = [{ id: 'cold-coffee', name: 'Old name', unitPrice: 1, quantity: 2 }, { id: 'fries', name: 'Fries', unitPrice: 1, quantity: 1 }]
  const booking = make({ addOns })
  assert.equal(booking.gamingPrice, 400)
  assert.equal(booking.foodSubtotal, 280)
  assert.equal(booking.price, 680)
  assert.equal(booking.addOns[0].unitPrice, 80)
  assert.equal(addOnSubtotal(booking.addOns), 280)
  assert.equal(validBookings([booking]), true)
  assert.equal(make({ addOns: [] }).price, 400)
  for (const quantity of [-1, 0, 1.5, 100]) assert.throws(() => make({ addOns: [{ ...addOns[0], quantity }] }), /Invalid food/)
  assert.throws(() => make({ addOns: [addOns[0], addOns[0]] }), /Invalid food/)
  const legacy = { ...make() }
  delete legacy.addOns
  delete legacy.gamingPrice
  delete legacy.foodSubtotal
  const normalized = normalizeBooking(legacy)
  assert.deepEqual(normalized.addOns, [])
  assert.equal(normalized.price, legacy.price)
  assert.equal(normalized.gamingPrice, 400)
  assert.equal(validBookings([legacy]), true)
})
