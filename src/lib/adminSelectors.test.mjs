import test from 'node:test'
import assert from 'node:assert/strict'
import { stations } from '../data/bookingCatalog.js'
import { floorZones, stationPositions } from '../data/adminLayout.js'
import { operationalSnapshot, paymentStatus, foodStatus, remainingMinutes } from './adminSelectors.js'
import { bookingCandidate, demoReservationsForDate, stationStatus, startOfSlot } from './bookingRules.js'

const date = '2030-01-02'
const at = (hour, minutes = 0) => startOfSlot(date, hour) + minutes * 60000
const reservation = (patch = {}) => ({ ...bookingCandidate({ stationId: 'ps-03', date, hour: 16, duration: 1 }), id: 'saved', userId: 'demo-customer', createdAt: at(10), status: 'confirmed', ...patch })

test('floor config covers the real catalog exactly and positions do not collide within zones', () => {
  assert.deepEqual(Object.keys(stationPositions).sort(), stations.map((station) => station.id).sort())
  for (const zone of floorZones) {
    const coordinates = stations.filter((station) => station.zoneId === zone.id).map((station) => stationPositions[station.id].join(','))
    assert.equal(new Set(coordinates).size, coordinates.length)
  }
})

test('overview partitions the same station views used by the floor, including maintenance precedence', () => {
  const noon = operationalSnapshot([], at(12, 30))
  assert.equal(noon.stationViews.length, 14)
  assert.deepEqual(noon.counts, { Available: 0, Reserved: 0, Occupied: 13, Maintenance: 1 })
  assert.equal(Object.values(noon.counts).reduce((sum, count) => sum + count, 0), stations.length)
  const afternoon = operationalSnapshot([], at(14, 30))
  assert.deepEqual(afternoon.counts, { Available: 10, Reserved: 3, Occupied: 0, Maintenance: 1 })
  assert.equal(operationalSnapshot([], at(18)).counts.Available, 13)
})

test('confirmed sessions occupy only half-open intervals; pending holds never invent active sessions', () => {
  const booking = reservation()
  assert.equal(operationalSnapshot([booking], at(15)).stationViews.find((view) => view.station.id === 'ps-03').status, 'Reserved')
  const view = operationalSnapshot([booking], at(16)).stationViews.find((view) => view.station.id === 'ps-03')
  assert.equal(view.status, 'Occupied')
  assert.equal(remainingMinutes(view.active, at(16, 30)), 30)
  assert.equal(operationalSnapshot([booking], at(17)).stationViews.find((view) => view.station.id === 'ps-03').status, 'Available')
  const pending = operationalSnapshot([reservation({ status: 'pending' })], at(16, 30)).stationViews.find((view) => view.station.id === 'ps-03')
  assert.equal(pending.status, 'Reserved')
  assert.equal(pending.active, undefined)
  const cancelled = operationalSnapshot([reservation({ status: 'cancelled' })], at(16, 30)).stationViews.find((view) => view.station.id === 'ps-03')
  assert.equal(cancelled.status, 'Available')
})

test('admin and customer use identical recurring fixture intervals and IDs remain stable', () => {
  const fixtures = demoReservationsForDate(date)
  assert.equal(fixtures[0].id, demoReservationsForDate(date)[0].id)
  assert.equal(stationStatus({ stationId: 'ps-02', date, hour: 14, duration: 1 }, [], at(10)), 'Pending')
  assert.equal(operationalSnapshot([], at(14, 30)).stationViews.find((view) => view.station.id === 'ps-02').status, 'Reserved')
  assert.equal(fixtures.find((booking) => booking.stationId === 'ps-01').foodSubtotal, 200)
})

test('revenue counts only known paid transactions on the local day, not booking status', () => {
  const baseline = operationalSnapshot([], at(18))
  assert.equal(baseline.revenue, 1050)
  const paid = reservation({ paymentStatus: 'paid', paidAt: at(11) })
  const pending = reservation({ id: 'pending', paymentStatus: 'pending' })
  const previousDay = reservation({ id: 'previous', paymentStatus: 'paid', paidAt: at(11) - 86400000 })
  const future = reservation({ id: 'future', paymentStatus: 'paid', paidAt: at(19) })
  const missing = reservation({ id: 'missing', paymentStatus: 'paid' })
  const snapshot = operationalSnapshot([paid, pending, previousDay, future, missing], at(18))
  assert.equal(snapshot.revenue, baseline.revenue + paid.price)
  assert.equal(snapshot.pendingPayments, baseline.pendingPayments + 1)
})

test('legacy records retain identity and totals, unknown metadata is not treated as paid or fulfilled', () => {
  const legacy = reservation()
  delete legacy.addOns
  delete legacy.gamingPrice
  delete legacy.foodSubtotal
  const original = JSON.stringify(legacy)
  const snapshot = operationalSnapshot([legacy], at(16, 30))
  assert.equal(JSON.stringify(legacy), original)
  assert.equal(snapshot.records.find((booking) => booking.id === legacy.id).gamingPrice, 200)
  assert.equal(paymentStatus(legacy), 'unknown')
  assert.equal(foodStatus(legacy), 'unknown')
  const view = snapshot.stationViews.find((view) => view.station.id === legacy.stationId)
  assert.equal(view.active.id, legacy.id)
  assert.equal(view.status, 'Occupied')
})
