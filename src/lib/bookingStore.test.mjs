import test from 'node:test'
import assert from 'node:assert/strict'
import { readBookings, reserveDemo } from './bookingStore.js'
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

  storage.set(AUTH_KEY, JSON.stringify({ id: 'customer-b' }))
  const input = { stationId: 'ps-03', date: localDate(Date.now(), 1), hour: 16, duration: 2, addOns: [{ id: 'fries', name: 'French Fries', unitPrice: 120, quantity: 2 }] }
  const saved = await reserveDemo(input, 'customer-b')
  assert.equal(saved.price, 640)
  const persisted = readBookings()
  assert.equal(persisted.length, 2)
  assert.equal(persisted[0].id, 'legacy-id')
  assert.equal(persisted[0].start, legacy.start)
  assert.equal(persisted[0].price, legacy.price)
  assert.deepEqual(persisted[1].addOns, saved.addOns)
  await assert.rejects(reserveDemo(input, 'customer-b'), /Reserved in this browser/)
  assert.equal(readBookings().length, 2)
})
