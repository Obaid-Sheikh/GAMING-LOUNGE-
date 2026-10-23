import test from 'node:test'
import assert from 'node:assert/strict'
import { readBookings, reserveDemo, cancelDemo } from './bookingStore.js'
import { REPOSITORY_KEY } from './mockRepository.js'
import { AUTH_KEY, BOOKINGS_KEY } from './demoStorage.js'
import { createReservation, localDate } from './bookingRules.js'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}
globalThis.window = new EventTarget()

test('reading legacy storage normalizes without rewriting or seeding over existing reservations', async () => {
  storage.clear()
  const oldNow = Date.parse('2030-01-01T03:00:00Z')
  const legacy = createReservation({ stationId: 'ps-01', date: '2030-01-02', hour: 16, duration: 1 }, [], 'customer-a', oldNow, 'legacy-id')
  delete legacy.addOns
  delete legacy.foodSubtotal
  delete legacy.gamingPrice
  delete legacy.gameId
  const original = JSON.stringify([legacy])
  storage.set(BOOKINGS_KEY, original)
  const read = readBookings()
  assert.equal(read.length, 1)
  assert.deepEqual(read[0].addOns, [])
  assert.equal(read[0].gamingPrice, 200)
  assert.equal(storage.get(BOOKINGS_KEY), original)

  storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-customer' }))
  const input = { stationId: 'ps-03', date: localDate(Date.now(), 1), hour: 16, duration: 2, addOns: [{ id: 'fries', name: 'French Fries', unitPrice: 120, quantity: 2 }] }
  const saved = await reserveDemo(input, 'demo-customer')
  assert.equal(saved.price, 640)
  const persisted = readBookings()
  assert.equal(persisted.length, 2)
  assert.equal(persisted[0].id, 'legacy-id')
  assert.equal(persisted[0].start, legacy.start)
  assert.equal(persisted[0].price, legacy.price)
  assert.deepEqual(persisted[1].addOns, saved.addOns)
  await assert.rejects(reserveDemo(input, 'demo-customer'), /Reserved in this browser/)
  assert.equal(readBookings().length, 2)
})

test('customer mutations reject unknown, mismatched, administrator and ended sessions without writing', async () => {
  storage.clear()
  const input = { stationId: 'ps-03', date: localDate(Date.now(), 1), hour: 16, duration: 1 }
  storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-customer' }))
  const booking = await reserveDemo(input, 'demo-customer')
  const original = storage.get(REPOSITORY_KEY)
  for (const [session, userId] of [
    [{ id: 'unknown-customer' }, 'unknown-customer'],
    [{ id: 'demo-customer' }, 'someone-else'],
    [{ id: 'demo-admin' }, 'demo-admin'],
    [null, 'demo-customer'],
  ]) {
    if (session) storage.set(AUTH_KEY, JSON.stringify(session))
    else storage.delete(AUTH_KEY)
    await assert.rejects(reserveDemo({ ...input, stationId: 'ps-04' }, userId), /session has ended/)
    await assert.rejects(cancelDemo(booking.id, userId), /session has ended/)
    assert.equal(storage.get(REPOSITORY_KEY), original)
  }
})
