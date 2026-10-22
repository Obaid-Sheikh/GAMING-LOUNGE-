import test from 'node:test'
import assert from 'node:assert/strict'
import { applyAdminOperation } from './adminManagement.js'
import { defaultInventory, currentMaintenance } from './inventory.js'
import { availability, bookingCandidate, createReservation, demoReservationsForDate, isSessionActive, startOfSlot } from './bookingRules.js'
import { operationalSnapshot } from './adminSelectors.js'
import { validateRepository } from './mockRepository.js'
const admin = { id: 'demo-admin', role: 'admin' }
const date = '2030-01-02'
const at = (hour, minutes = 0) => startOfSlot(date, hour) + minutes * 60000
const fresh = () => ({ schemaVersion: 1, revision: 0, inventory: defaultInventory(), bookings: [], activity: [] })
const newStation = (patch = {}) => ({ id: 'ps-06', name: 'PlayStation Six', zoneId: 'playstation', equipment: 'PlayStation console', rate: 250, capacity: 2, games: ['fc'], amenities: [], active: true, archived: false, ...patch })
function act(state, operation, now = at(10)) {
  const copy = structuredClone(state)
  const result = applyAdminOperation(copy, admin, operation, now)
  assert.equal(validateRepository(copy), true, 'every successful transaction is valid')
  Object.assign(state, copy)
  return result
}
const add = (state, patch) => act(state, { type: 'station.save', values: newStation(patch) })
const walk = (state, patch = {}, now = at(10)) => act(state, { type: 'walk-in.create', values: { customerName: 'Walk-in Guest', stationId: 'ps-06', date, hour: 16, duration: 1, ...patch } }, now)

test('adds a valid station with an unoccupied position and shared availability', () => {
 const s = fresh(); const station = add(s)
 assert.equal(station.id, 'ps-06'); assert.deepEqual(station.position, [2, 2])
 assert.equal(availability({ stationId: station.id, date, hour: 16, duration: 1 }, [], at(10), s.inventory), '')
 assert.equal(operationalSnapshot([], at(10), s.inventory).stationViews.length, 15)
 assert.equal(s.activity[0].action, 'station.created')
})
test('rejects duplicate IDs including archived stations, invalid rates/capacity, and unsupported games', () => {
 const s = fresh(); add(s)
 assert.throws(() => add(s), /already exists/)
 act(s, { type: 'station.archive', id: 'ps-06' })
 assert.throws(() => add(s), /already exists/)
 for (const patch of [{ rate: -1 }, { rate: NaN }, { rate: 1.001 }, { capacity: 0 }, { capacity: 1.5 }, { games: ['valorant'] }, { id: '' }]) assert.throws(() => add(fresh(), patch))
})
test('station edits keep IDs immutable and check floor position collisions', () => {
 const s = fresh(); const station = add(s)
 const updated = act(s, { type: 'station.save', id: station.id, values: { ...station, name: 'Updated', rate: 300 } })
 assert.equal(updated.name, 'Updated')
 assert.throws(() => act(s, { type: 'station.save', id: station.id, values: { ...updated, id: 'other-id' } }), /cannot be changed/)
 assert.throws(() => act(s, { type: 'station.save', id: station.id, values: { ...updated, position: [1, 1] } }), /occupied/)
 assert.throws(() => act(s, { type: 'station.save', id: station.id, values: { ...updated, position: [1, 99] } }), /position/)
})
test('archives and restores without deleting history or overlapping restored positions', () => {
 const s = fresh(); add(s); const b = walk(s)
 act(s, { type: 'booking.cancel', id: b.id, values: { reason: 'Customer left' } })
 act(s, { type: 'station.archive', id: 'ps-06' })
 assert.equal(s.bookings[0].id, b.id)
 assert.equal(operationalSnapshot(s.bookings, at(10), s.inventory).stationViews.some((view) => view.station.id === 'ps-06'), false)
 assert.match(availability({ stationId: 'ps-06', date, hour: 18, duration: 1 }, s.bookings, at(10), s.inventory), /inactive/)
 act(s, { type: 'station.restore', id: 'ps-06' }); assert.equal(s.inventory.stations.find((item) => item.id === 'ps-06').archived, false)
})
test('unresolved bookings protect archive, deactivation, zone changes and maintenance; failures are atomic', () => {
 const s = fresh(); const station = add(s); walk(s)
 const original = JSON.stringify(s)
 for (const operation of [{ type: 'station.archive', id: station.id }, { type: 'maintenance.start', id: station.id, values: { reason: 'Repair' } }, { type: 'station.save', id: station.id, values: { ...station, active: false } }, { type: 'station.save', id: station.id, values: { ...station, zoneId: 'xbox', games: ['fc'] } }]) assert.throws(() => act(s, operation), /Resolve/)
 assert.equal(JSON.stringify(s), original)
})
test('maintenance blocks new bookings and records restoration history', () => {
 const s = fresh(); add(s)
 act(s, { type: 'maintenance.start', id: 'ps-06', values: { reason: 'Controller repair' } })
 assert.equal(currentMaintenance(s.inventory, 'ps-06').startedAt, at(10))
 assert.throws(() => walk(s), /Maintenance/)
 act(s, { type: 'maintenance.end', id: 'ps-06' }, at(11))
 assert.equal(currentMaintenance(s.inventory, 'ps-06'), undefined)
 assert.equal(s.inventory.maintenance.at(-1).endedAt, at(11))
 assert.equal(walk(s).source, 'walk-in')
})
test('zone edits preserve stable IDs, order, and prevent disabling unresolved reservations', () => {
 const s = fresh(); add(s); const b = walk(s)
 const zone = s.inventory.zones[0]
 assert.throws(() => act(s, { type: 'zone.save', id: zone.id, values: { ...zone, active: false } }), /Resolve/)
 act(s, { type: 'booking.cancel', id: b.id, values: { reason: 'Cancelled by guest' } })
 assert.throws(() => act(s, { type: 'zone.save', id: zone.id, values: { ...zone, archived: true } }), /Archive or reassign/)
 act(s, { type: 'zone.save', id: zone.id, values: { ...zone, name: 'Console Arena', order: 3, active: false } })
 assert.equal(s.inventory.zones[0].name, 'Console Arena')
 assert.match(availability({ stationId: 'ps-06', date, hour: 18, duration: 1 }, [], at(10), s.inventory), /inactive/)
})
test('walk-in uses shared pricing and food snapshots; contacts are omitted from activity values', () => {
 const s = fresh(); add(s)
 const b = walk(s, { customerContact: 'private phone', addOns: [{ id: 'fries', name: 'Wrong', unitPrice: 1, quantity: 2 }] })
 assert.equal(b.price, 490); assert.equal(b.addOns[0].unitPrice, 120); assert.equal(b.source, 'walk-in'); assert.equal(b.sessionMode, 'manual')
 assert.equal(JSON.stringify(s.activity).includes('private phone'), false)
 assert.equal(b.customerContact, 'private phone')
 assert.equal(operationalSnapshot(s.bookings, at(16, 10), s.inventory).stationViews.find((view) => view.station.id === 'ps-06').status, 'Reserved')
})
test('walk-ins reject overlaps, maintenance, inactive stations, expired intervals and invalid input', () => {
 const s = fresh(); add(s); walk(s)
 assert.throws(() => walk(s), /Reserved/)
 for (const patch of [{ customerName: '' }, { hour: 22 }, { duration: 4 }, { date: '2030-02-30' }, { gameId: 'valorant' }]) assert.throws(() => walk(s, patch))
 assert.throws(() => walk(s, { hour: 10 }, at(11)), /not ended/)
 const inactive = fresh(); add(inactive, { active: false }); assert.throws(() => walk(inactive), /inactive/)
})
test('cancellation preserves ownership, prices, reason and history and releases the slot', () => {
 const s = fresh(); add(s)
 const b = { ...createReservation({ stationId: 'ps-06', date, hour: 16, duration: 1 }, [], 'demo-customer', at(10), 'owned', s.inventory), sessionMode: 'manual' }; s.bookings.push(b)
 act(s, { type: 'booking.cancel', id: b.id, values: { reason: 'Requested by customer' } })
 assert.equal(s.bookings[0].userId, 'demo-customer'); assert.equal(s.bookings[0].price, 250)
 assert.equal(s.bookings[0].cancellationReason, 'Requested by customer'); assert.equal(s.bookings[0].history[0].before.status, 'confirmed')
 assert.equal(availability({ stationId: 'ps-06', date, hour: 16, duration: 1 }, s.bookings, at(10), s.inventory), '')
})
test('rescheduling retains ownership and food prices, checks conflicts and preserves previous schedule', () => {
 const s = fresh(); add(s); const b = walk(s, { addOns: [{ id: 'fries', name: 'Fries', unitPrice: 120, quantity: 1 }] })
 act(s, { type: 'booking.reschedule', id: b.id, values: { stationId: 'ps-06', date, hour: 18, duration: 2 } })
 const updated = s.bookings[0]; assert.equal(updated.userId, b.userId); assert.equal(updated.price, 620); assert.equal(updated.addOns[0].unitPrice, 120)
 assert.equal(updated.history[0].before.start, b.start)
 assert.throws(() => act(s, { type: 'booking.reschedule', id: b.id, values: { stationId: 'ps-01', date, hour: 12, duration: 1 } }), /Demo occupied/)
})
test('station rate changes do not alter saved bookings or same-station reschedule/extension rates', () => {
 const s = fresh(); const station = add(s); const b = walk(s)
 act(s, { type: 'station.save', id: station.id, values: { ...station, rate: 900 } })
 assert.equal(s.bookings[0].price, 250)
 act(s, { type: 'session.extend', id: b.id, values: { endHour: 18 } })
 assert.equal(s.bookings[0].price, 500)
 act(s, { type: 'booking.reschedule', id: b.id, values: { stationId: 'ps-06', date, hour: 19, duration: 1 } })
 assert.equal(s.bookings[0].price, 250)
})
test('starting records actual time, does not start future sessions, and prevents simultaneous active sessions', () => {
 const s = fresh(); add(s); const b = walk(s)
 assert.throws(() => act(s, { type: 'session.start', id: b.id }, at(15)), /during its scheduled/)
 act(s, { type: 'session.start', id: b.id }, at(16, 5))
 assert.equal(s.bookings[0].actualStart, at(16, 5)); assert.equal(s.bookings[0].start, at(16)); assert.equal(isSessionActive(s.bookings[0], at(17, 30)), true)
 assert.equal(operationalSnapshot(s.bookings, at(16, 10), s.inventory).stationViews.find((view) => view.station.id === 'ps-06').status, 'Occupied')
 assert.throws(() => act(s, { type: 'session.start', id: b.id }, at(16, 6)), /unstarted/)
 assert.equal(availability({ stationId: 'ps-06', date, hour: 18, duration: 1 }, s.bookings, at(16, 10), s.inventory), '')
})
test('ending early releases physical occupancy but preserves reserved interval, next reservation and actual timestamps', () => {
 const s = fresh(); add(s); const b = walk(s); const next = walk(s, { hour: 17 })
 act(s, { type: 'session.start', id: b.id }, at(16, 5)); act(s, { type: 'session.end', id: b.id }, at(16, 15))
 const ended = s.bookings[0]; assert.equal(ended.actualStart, at(16, 5)); assert.equal(ended.actualEnd, at(16, 15)); assert.equal(ended.end, at(17)); assert.equal(ended.status, 'completed'); assert.equal(ended.price, 250)
 assert.equal(operationalSnapshot(s.bookings, at(16, 20), s.inventory).counts.Occupied, 0)
 assert.match(availability({ stationId: 'ps-06', date, hour: 16, duration: 1 }, s.bookings, at(16, 20), s.inventory, { allowStartedSlot: true }), /Reserved/)
 assert.equal(s.bookings[1].id, next.id); assert.equal(s.bookings[1].status, 'confirmed')
 assert.throws(() => act(s, { type: 'session.end', id: b.id }, at(16, 30)), /active session/)
})
test('extensions preserve actual and scheduled history, food and payment state; reject subsequent reservations and closing violations', () => {
 const s = fresh(); add(s); const b = walk(s, { addOns: [{ id: 'fries', name: 'Fries', unitPrice: 120, quantity: 1 }] })
 act(s, { type: 'session.start', id: b.id }, at(16, 5)); act(s, { type: 'session.extend', id: b.id, values: { endHour: 18 } }, at(16, 10))
 assert.equal(s.bookings[0].end, at(18)); assert.equal(s.bookings[0].actualStart, at(16, 5)); assert.equal(s.bookings[0].price, 620); assert.equal(s.bookings[0].foodSubtotal, 120)
 assert.equal(s.bookings[0].history.at(-1).before.end, at(17)); assert.equal(s.bookings[0].paymentStatus, undefined)
 walk(s, { hour: 18 }); assert.throws(() => act(s, { type: 'session.extend', id: b.id, values: { endHour: 19 } }, at(16, 15)), /Reserved/)
 assert.throws(() => act(s, { type: 'session.extend', id: b.id, values: { endHour: 23 } }, at(16, 15)), /Outside demo hours/)
})
test('fixtures stay read-only and are never inserted into persisted bookings', () => {
 const s = fresh(); const fixture = demoReservationsForDate(date, s.inventory)[0]
 for (const type of ['session.start', 'session.end', 'session.extend', 'booking.cancel', 'booking.reschedule']) assert.throws(() => act(s, { type, id: fixture.id }), /read-only/)
 assert.equal(s.bookings.length, 0); assert.equal(validateRepository({ ...s, bookings: [fixture] }), false)
})
test('all admin operations require admin identity and stale forms are rejected', () => {
 const s = fresh(); assert.throws(() => applyAdminOperation(s, { id: 'demo-customer', role: 'customer' }, { type: 'station.save', values: newStation() }), /administrator/)
 assert.throws(() => act(s, { type: 'station.save', values: newStation(), expectedRevision: 9 }), /changed in another view/)
})

test('a subsequent reservation cannot start while the previous physical session overruns', () => {
 const s = fresh(); add(s); const first = walk(s); const next = walk(s, { hour: 17 })
 act(s, { type: 'session.start', id: first.id }, at(16, 5))
 assert.throws(() => act(s, { type: 'session.start', id: next.id }, at(17, 5)), /conflicts/)
 act(s, { type: 'session.end', id: first.id }, at(17, 10))
 act(s, { type: 'session.start', id: next.id }, at(17, 11))
 assert.equal(s.bookings[1].actualStart, at(17, 11))
})
test('an extension does not turn an increased amount into an invented paid transaction', () => {
 const s = fresh(); add(s); const booking = walk(s)
 Object.assign(s.bookings[0], { paymentStatus: 'paid', paidAt: at(10), paidAmount: booking.price })
 const revenue = operationalSnapshot(s.bookings, at(10), s.inventory).revenue
 act(s, { type: 'session.extend', id: booking.id, values: { endHour: 18 } })
 assert.equal(s.bookings[0].price, 500); assert.equal(s.bookings[0].paidAmount, 250); assert.equal(s.bookings[0].paymentStatus, 'paid')
 assert.equal(operationalSnapshot(s.bookings, at(10), s.inventory).revenue, revenue)
})

test('inactive inventory is separate from maintenance and cannot accept reservations', () => {
 const s = fresh(); add(s, { active: false })
 const snapshot = operationalSnapshot([], at(10), s.inventory)
 assert.equal(snapshot.counts.Inactive, 1); assert.equal(snapshot.counts.Maintenance, 1)
 assert.equal(snapshot.stationViews.find((view) => view.station.id === 'ps-06').status, 'Inactive')
 assert.throws(() => walk(s), /inactive/)
})
test('removing a game required by a future reservation requires resolution first', () => {
 const s = fresh(); const station = add(s); walk(s, { gameId: 'fc' })
 assert.throws(() => act(s, { type: 'station.save', id: station.id, values: { ...station, games: [] } }), /Resolve/)
})

test('an actual start later than the selected snapshot is never physically occupied', () => {
 const s = fresh(); add(s); const b = walk(s)
 act(s, { type: 'session.start', id: b.id }, at(16, 5))
 assert.equal(isSessionActive(s.bookings[0], at(15)), false)
 assert.equal(operationalSnapshot(s.bookings, at(15), s.inventory).stationViews.find((view) => view.station.id === 'ps-06').status, 'Reserved')
})

test('early completion retains a Reserved floor state until the original scheduled end', () => {
 const s = fresh(); add(s); const b = walk(s)
 act(s, { type: 'session.start', id: b.id }, at(16, 5)); act(s, { type: 'session.end', id: b.id }, at(16, 10))
 assert.equal(operationalSnapshot(s.bookings, at(16, 15), s.inventory).stationViews.find((view) => view.station.id === 'ps-06').status, 'Reserved')
 assert.equal(operationalSnapshot(s.bookings, at(17), s.inventory).stationViews.find((view) => view.station.id === 'ps-06').status, 'Available')
})
test('schema refuses conflicting scheduled or actual reservations without losing stored records', () => {
 const s = fresh(); add(s); const b = walk(s)
 const invalid = structuredClone(s); invalid.bookings.push({ ...b, id: 'overlap' })
 assert.equal(validateRepository(invalid), false)
 const adjacent = structuredClone(s); adjacent.bookings.push({ ...b, id: 'adjacent', start: b.end, end: b.end + 3600000 })
 assert.equal(validateRepository(adjacent), true)
 adjacent.bookings[0].actualStart = at(16, 5); adjacent.bookings[1].actualStart = at(17, 5)
 assert.equal(validateRepository(adjacent), false)
})

test('fractional INR rates display accurately and fixture booked prices do not change after inventory repricing', async () => {
 const { money } = await import('../data/bookingCatalog.js')
 const s = fresh(); add(s, { rate: 250.5 }); const b = walk(s)
 assert.equal(b.price, 250.5); assert.match(money(b.price), /250\.50/)
 const before = demoReservationsForDate(date, s.inventory)[0]
 const station = s.inventory.stations.find((station) => station.id === 'ps-01')
 act(s, { type: 'station.save', id: station.id, values: { ...station, rate: 900 } })
 assert.equal(demoReservationsForDate(date, s.inventory)[0].price, before.price)
})
