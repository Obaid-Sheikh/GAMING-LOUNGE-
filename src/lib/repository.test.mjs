import test from 'node:test'
import assert from 'node:assert/strict'
import { readRepository, transact, REPOSITORY_KEY, REPOSITORY_EVENT, isRepositoryStorageEvent, validateRepository } from './mockRepository.js'
import { AUTH_KEY, BOOKINGS_KEY } from './demoStorage.js'
import { runAdmin } from './adminManagement.js'
import { availability, createReservation, startOfSlot } from './bookingRules.js'
import { reserveDemo } from './bookingStore.js'
const storage = new Map()
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
globalThis.window = new EventTarget()
const date = '2030-01-02'
const now = startOfSlot('2030-01-01', 10)
const values = { id: 'test-ps', name: 'Test PlayStation', zoneId: 'playstation', equipment: 'Console', rate: 200, capacity: 1, games: ['fc'], amenities: [], active: true, archived: false }
function login(role = 'admin') { storage.set(AUTH_KEY, JSON.stringify({ id: role === 'admin' ? 'demo-admin' : 'demo-customer' })) }

test('initialization is read-only and first admin write migrates legacy reservations atomically', async () => {
 storage.clear()
 const legacy = createReservation({ stationId: 'ps-01', date, hour: 16, duration: 1 }, [], 'demo-customer', now, 'legacy')
 delete legacy.addOns; delete legacy.gamingPrice; delete legacy.foodSubtotal
 const raw = JSON.stringify([legacy]); storage.set(BOOKINGS_KEY, raw)
 const initial = readRepository(); assert.equal(initial.bookings[0].id, 'legacy'); assert.equal(storage.has(REPOSITORY_KEY), false); assert.equal(storage.get(BOOKINGS_KEY), raw)
 login(); await runAdmin({ type: 'station.save', values })
 const saved = readRepository(); assert.equal(saved.bookings.length, 1); assert.equal(saved.bookings[0].price, 200); assert.deepEqual(saved.bookings[0].addOns, [])
 assert.equal(storage.get(BOOKINGS_KEY), raw); assert.equal(saved.inventory.stations.some((station) => station.id === 'test-ps'), true)
 assert.equal(availability({ stationId: 'test-ps', date, hour: 16, duration: 1 }, saved.bookings, now), '')
})
test('management rejects absent/customer sessions before mutating storage', async () => {
 storage.clear(); await assert.rejects(runAdmin({ type: 'station.save', values }), /administrator/)
 login('customer'); await assert.rejects(runAdmin({ type: 'station.save', values }), /administrator/)
 assert.equal(storage.has(REPOSITORY_KEY), false)
 await assert.rejects(runAdmin({ type: 'walk-in.create', values: {} }), /administrator/)
})
test('malformed saved data fails closed and is never silently replaced with seeds', async () => {
 storage.clear(); storage.set(REPOSITORY_KEY, '{invalid'); const raw = storage.get(REPOSITORY_KEY)
 assert.throws(readRepository, /could not be read/); login(); await assert.rejects(runAdmin({ type: 'station.save', values }), /could not be read/)
 assert.equal(storage.get(REPOSITORY_KEY), raw)
 storage.clear(); storage.set(BOOKINGS_KEY, '[{"id":"bad"}]'); assert.throws(readRepository, /could not be read/); assert.equal(storage.has(REPOSITORY_KEY), false)
})
test('schema rejects lost default IDs, duplicate floor positions, bad timestamps, totals and fixture records', () => {
 storage.clear(); const base = readRepository()
 assert.equal(validateRepository(base), true)
 const lost = structuredClone(base); lost.inventory.stations.pop(); assert.equal(validateRepository(lost), false)
 const duplicate = structuredClone(base); duplicate.inventory.stations[1].position = duplicate.inventory.stations[0].position; assert.equal(validateRepository(duplicate), false)
 const b = createReservation({ stationId: 'ps-01', date, hour: 16, duration: 1 }, [], 'demo-customer', now, 'test')
 for (const patch of [{ actualStart: 'invalid' }, { actualEnd: now }, { gamingPrice: 1 }, { foodSubtotal: 200 }, { sessionMode: 'automatic' }, { fixture: true }, { status: 'completed' }]) assert.equal(validateRepository({ ...base, bookings: [{ ...b, ...patch }] }), false)
})
test('successful mutations publish a shared event; cross-tab event selection re-reads the latest revision', async () => {
 storage.clear(); login(); let observed
 const listener = () => { observed = readRepository() }
 window.addEventListener(REPOSITORY_EVENT, listener)
 await runAdmin({ type: 'station.save', values }); assert.equal(observed.revision, 1)
 const otherTab = structuredClone(observed); otherTab.revision++; otherTab.inventory.stations.find((station) => station.id === 'test-ps').name = 'Changed in another tab'
 storage.set(REPOSITORY_KEY, JSON.stringify(otherTab))
 assert.equal(isRepositoryStorageEvent({ type: 'storage', key: REPOSITORY_KEY }), true)
 assert.equal(isRepositoryStorageEvent({ type: 'storage', key: BOOKINGS_KEY }), true)
 assert.equal(isRepositoryStorageEvent({ type: 'storage', key: null }), true)
 assert.equal(isRepositoryStorageEvent({ type: 'storage', key: AUTH_KEY }), false)
 assert.equal(readRepository().inventory.stations.find((station) => station.id === 'test-ps').name, 'Changed in another tab')
 window.removeEventListener(REPOSITORY_EVENT, listener)
})
test('a storage write failure leaves bookings, inventory and log unchanged', async () => {
 storage.clear(); login(); await runAdmin({ type: 'station.save', values }); const original = storage.get(REPOSITORY_KEY)
 const setItem = localStorage.setItem
 localStorage.setItem = () => { throw new Error('quota') }
 try { await assert.rejects(runAdmin({ type: 'station.archive', id: 'test-ps' }), /Could not save/) } finally { localStorage.setItem = setItem }
 assert.equal(storage.get(REPOSITORY_KEY), original)
})
test('cooperating transactions use the shared Web Lock and preserve concurrent changes', async () => {
 storage.clear(); login()
 let tail = Promise.resolve(); const keys = []
 Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (key, callback) => { keys.push(key); const next = tail.then(callback); tail = next.catch(() => {}); return next } } })
 try {
  await Promise.all([runAdmin({ type: 'station.save', values }), runAdmin({ type: 'station.save', values: { ...values, id: 'test-pc', zoneId: 'pc', games: ['valorant'] } })])
  assert.deepEqual(keys, [REPOSITORY_KEY, REPOSITORY_KEY]); assert.equal(readRepository().revision, 2); assert.equal(readRepository().inventory.stations.length, 16)
 } finally { delete navigator.locks }
})
test('stale admin forms fail without overwriting newer changes', async () => {
 storage.clear(); login(); await runAdmin({ type: 'station.save', values })
 const previous = readRepository()
 await runAdmin({ type: 'station.save', id: values.id, values: { ...previous.inventory.stations.find((station) => station.id === values.id), name: 'Newer name' } })
 await assert.rejects(runAdmin({ type: 'station.save', id: values.id, values: previous.inventory.stations.find((station) => station.id === values.id), expectedRevision: previous.revision }), /changed in another view/)
 assert.equal(readRepository().inventory.stations.find((station) => station.id === values.id).name, 'Newer name')
})
test('customer booking writes revalidate the latest inventory and preserve original reservations', async () => {
 storage.clear(); login(); await runAdmin({ type: 'station.save', values }); await runAdmin({ type: 'maintenance.start', id: values.id, values: { reason: 'Repair' } })
 login('customer')
 const future = new Date(Date.now() + 86400000); const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(future); const get = (type) => parts.find((part) => part.type === type).value
 await assert.rejects(reserveDemo({ stationId: values.id, date: `${get('year')}-${get('month')}-${get('day')}`, hour: 16, duration: 1 }, 'demo-customer'), /Maintenance/)
 assert.equal(readRepository().bookings.length, 0)
})
test('invalid mutations fail schema validation without changing the authoritative record', async () => {
 storage.clear(); const original = readRepository()
 await assert.rejects(transact((state) => { state.inventory.zones = [] }), /invalid demo data/)
 assert.equal(storage.has(REPOSITORY_KEY), false); assert.equal(readRepository().inventory.stations.length, original.inventory.stations.length)
})
