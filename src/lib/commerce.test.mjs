import test from 'node:test'
import assert from 'node:assert/strict'
import { readRepository, transact, validateRepository, REPOSITORY_KEY, REPOSITORY_EVENT, isRepositoryStorageEvent } from './mockRepository.js'
import { AUTH_KEY } from './demoStorage.js'
import { defaultInventory } from './inventory.js'
import { migrateCommerce, paymentSummary, syncBookingOrders } from './commerceSchema.js'
import { applyAdminOperation, runAdmin } from './adminManagement.js'
import { reserveDemo } from './bookingStore.js'
import { createReservation, startOfSlot, localDate } from './bookingRules.js'
import { analytics, reportingRange, customerDirectory, commerceSnapshot, orderNeedsReview, csvText } from './commerceSelectors.js'
const storage = new Map()
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
globalThis.window = new EventTarget()
const admin = { id: 'demo-admin', role: 'admin' }
const at = (hour, day = '2030-01-02') => startOfSlot(day, hour)
const fresh = () => migrateCommerce({ schemaVersion: 1, revision: 0, inventory: defaultInventory(), bookings: [], activity: [] })
const addon = { id: 'fries', name: 'French Fries', unitPrice: 120, quantity: 2 }
function booking(state, patch = {}) {
 const b = { ...createReservation({ stationId: 'ps-01', date: '2030-01-02', hour: 16, duration: 1, addOns: [addon], ...patch }, state.bookings, 'demo-customer', at(10), crypto.randomUUID(), state.inventory, { menu: state.menu, reviewFood: true }), sessionMode: 'manual', source: 'customer', ...patch }
 state.bookings.push(b); syncBookingOrders(state); return b
}
function act(state, type, id, values = {}, now = at(10)) {
 const copy = structuredClone(state); const result = applyAdminOperation(copy, admin, { type, id, values }, now); syncBookingOrders(copy)
 assert.equal(validateRepository(copy), true); Object.assign(state, copy); return result
}
const menuItem = { id: 'mock-pizza', name: 'Pizza', description: 'Demo pizza', category: 'Meals', price: 199.50, available: true }
const payment = (s, b, amount, patch = {}, now = at(10)) => act(s, 'payment.record', b.id, { type: 'payment', status: 'successful', amount, method: 'cash', note: '', reference: '', ...patch }, now)

test('menu create, edit, availability, archive and restore use stable IDs', () => {
 const s = fresh(); act(s, 'menu.save', undefined, menuItem)
 act(s, 'menu.save', menuItem.id, { ...menuItem, name: 'Pizza slice', price: 210 })
 act(s, 'menu.availability', menuItem.id, { available: false }); assert.equal(s.menu.at(-1).available, false)
 act(s, 'menu.archive', menuItem.id); assert.equal(s.menu.at(-1).archived, true)
 act(s, 'menu.restore', menuItem.id); assert.equal(s.menu.at(-1).archived, false)
 assert.equal(s.activity.length, 5)
})
test('menu validation rejects duplicate IDs including archived, invalid categories, prices, names and changed IDs', () => {
 const s = fresh(); act(s, 'menu.save', undefined, menuItem); act(s, 'menu.archive', menuItem.id)
 assert.throws(() => act(s, 'menu.save', undefined, menuItem), /Duplicate/)
 for (const patch of [{ price: -1 }, { price: NaN }, { price: 1.001 }, { category: 'Unknown' }, { name: '' }, { id: '' }]) assert.throws(() => act(s, 'menu.save', undefined, { ...menuItem, id: 'new-item', ...patch }))
 assert.throws(() => act(s, 'menu.save', menuItem.id, { ...menuItem, id: 'different' }), /cannot change/)
})
test('new booking validates latest menu and requires review after price change; historical snapshots remain unchanged', () => {
 const s = fresh(); const b = booking(s); const original = structuredClone(b)
 const fries = s.menu.find((item) => item.id === 'fries'); act(s, 'menu.save', 'fries', { ...fries, price: 150 })
 assert.deepEqual(s.bookings[0], original)
 assert.throws(() => createReservation({ stationId: 'ps-03', date: '2030-01-02', hour: 16, duration: 1, addOns: [addon] }, s.bookings, 'demo-customer', at(10), 'new', s.inventory, { menu: s.menu, reviewFood: true }), /menu changed/)
 const next = createReservation({ stationId: 'ps-03', date: '2030-01-02', hour: 16, duration: 1, addOns: [{ ...addon, unitPrice: 150 }] }, s.bookings, 'demo-customer', at(10), 'new', s.inventory, { menu: s.menu, reviewFood: true })
 assert.equal(next.foodSubtotal, 300); assert.equal(b.foodSubtotal, 240)
})
test('out of stock and archived menu items cannot be booked but historical orders stay readable', () => {
 const s = fresh(); booking(s)
 const make = () => createReservation({ stationId: 'ps-03', date: '2030-01-02', hour: 16, duration: 1, addOns: [addon] }, s.bookings, 'demo-customer', at(10), 'new', s.inventory, { menu: s.menu })
 act(s, 'menu.availability', 'fries', { available: false }); assert.throws(make, /unavailable/)
 act(s, 'menu.availability', 'fries', { available: true }); act(s, 'menu.archive', 'fries'); assert.throws(make, /unavailable/)
 assert.equal(s.orders[0].items[0].name, 'French Fries'); assert.equal(validateRepository(s), true)
})
test('each booking with food creates exactly one order without double charging', () => {
 const s = fresh(); const b = booking(s); syncBookingOrders(s); syncBookingOrders(s)
 assert.equal(s.orders.length, 1); assert.equal(s.orders[0].total, 240); assert.equal(b.price, 440)
 booking(s, { stationId: 'ps-03', addOns: [] }); assert.equal(s.orders.length, 1)
})
test('order workflow supports placed, preparing, ready and delivered with immutable history', () => {
 const s = fresh(); booking(s); const id = s.orders[0].id
 for (const status of ['preparing', 'ready', 'delivered']) act(s, 'order.status', id, { status })
 assert.equal(s.orders[0].history.length, 3); assert.equal(s.orders[0].status, 'delivered')
 assert.equal(s.orders[0].history[0].adminId, 'demo-admin'); assert.equal(s.activity[0].action, 'order.status')
 assert.throws(() => act(s, 'order.status', id, { status: 'cancelled' }), /Invalid/)
})
test('invalid order transitions are rejected and cancelled orders are terminal', () => {
 const s = fresh(); booking(s); const id = s.orders[0].id
 assert.throws(() => act(s, 'order.status', id, { status: 'delivered' }), /Invalid/)
 act(s, 'order.status', id, { status: 'cancelled' }); assert.throws(() => act(s, 'order.status', id, { status: 'delivered' }), /Invalid/)
})
test('booking cancellation preserves order and charges, flags resolution and never silently refunds', () => {
 const s = fresh(); const b = booking(s); payment(s, b, 100)
 act(s, 'booking.cancel', b.id, { reason: 'Customer request' }); assert.equal(s.orders[0].status, 'placed'); assert.equal(s.transactions.length, 1)
 assert.equal(orderNeedsReview(s.orders[0], s.bookings), true)
 assert.throws(() => act(s, 'order.status', s.orders[0].id, { status: 'preparing' }), /booking is cancelled/)
 act(s, 'order.status', s.orders[0].id, { status: 'cancelled' }); assert.equal(s.bookings[0].price, 440)
})
test('partial and multiple payments sum correctly and do not alter booking total', () => {
 const s = fresh(); const b = booking(s); payment(s, b, 100); assert.equal(paymentSummary(b, s.transactions).status, 'partial')
 payment(s, b, 340, { method: 'upi' }); assert.deepEqual(paymentSummary(b, s.transactions), { payments: 440, refunds: 0, net: 440, outstanding: 0, status: 'paid' }); assert.equal(b.price, 440)
})
test('pending and failed receipts/refunds never count as received or returned money', () => {
 const s = fresh(); const b = booking(s)
 payment(s, b, 100, { status: 'pending' }); payment(s, b, 100, { status: 'failed' }); assert.equal(paymentSummary(b, s.transactions).net, 0)
 payment(s, b, 100); payment(s, b, 50, { type: 'refund', status: 'pending' }); assert.equal(paymentSummary(b, s.transactions).net, 100)
})
test('payment validation rejects invalid amounts, overpayment, unknown methods and fixtures', () => {
 const s = fresh(); const b = booking(s)
 for (const value of [0, -1, NaN, 1.001, 441]) assert.throws(() => payment(s, b, value))
 assert.throws(() => payment(s, b, 10, { method: 'bitcoin' }))
 assert.throws(() => act(s, 'payment.record', 'fixture-2030-01-02-1', {}), /fixtures/)
})
test('refunds require successful collections, allow partial refund, and cannot exceed net receipts', () => {
 const s = fresh(); const b = booking(s)
 assert.throws(() => payment(s, b, 1, { type: 'refund' }), /refundable/)
 payment(s, b, 300); payment(s, b, 50, { type: 'refund' }); assert.equal(paymentSummary(b, s.transactions).outstanding, 190)
 assert.throws(() => payment(s, b, 251, { type: 'refund' }), /refundable/)
 payment(s, b, 250, { type: 'refund' }); assert.equal(paymentSummary(b, s.transactions).status, 'refunded')
})
test('extension preserves original ledger and food, increases outstanding without inventing payment', () => {
 const s = fresh(); const b = booking(s); payment(s, b, 440); const ledger = structuredClone(s.transactions)
 act(s, 'session.extend', b.id, { endHour: 18 }); assert.deepEqual(s.transactions, ledger)
 assert.equal(paymentSummary(s.bookings[0], s.transactions).outstanding, 200); assert.equal(s.bookings[0].foodSubtotal, 240); assert.equal(s.orders.length, 1)
})
test('cancelled bookings retain balances for review, accept explicit refunds but reject new payments', () => {
 const s = fresh(); const b = booking(s); payment(s, b, 200); act(s, 'booking.cancel', b.id, { reason: 'Cancelled' })
 assert.throws(() => payment(s, b, 10), /cancelled/); payment(s, b, 100, { type: 'refund' }); assert.equal(s.transactions.length, 2)
})
test('Phase 3B migration preserves inventory, bookings, activity and food snapshots; reads do not write', async () => {
 storage.clear(); const old = { schemaVersion: 1, revision: 7, inventory: defaultInventory(), bookings: [], activity: [] }
 const b = createReservation({ stationId: 'ps-01', date: '2030-01-02', hour: 16, duration: 1, addOns: [addon] }, [], 'customer', at(10), 'old', old.inventory)
 old.bookings.push({ ...b, paymentStatus: 'paid', paidAmount: 100, paidAt: at(11), foodOrderStatus: 'preparing' })
 const raw = JSON.stringify(old); storage.set(REPOSITORY_KEY, raw)
 const migrated = readRepository(); assert.equal(migrated.schemaVersion, 2); assert.equal(migrated.revision, 7); assert.equal(migrated.transactions.length, 1); assert.equal(migrated.transactions[0].amount, 100); assert.equal(migrated.orders[0].status, 'preparing')
 assert.deepEqual(migrated.inventory, old.inventory); assert.deepEqual(migrated.activity, old.activity); assert.deepEqual(migrated.bookings[0].addOns, b.addOns); assert.equal(storage.get(REPOSITORY_KEY), raw)
 await transact(() => {}); assert.equal(JSON.parse(storage.get(REPOSITORY_KEY)).schemaVersion, 2); assert.equal(readRepository().transactions.length, 1)
})
test('historical unknown/refunded/failed metadata never fabricates receipts; undated explicit receipts excluded from dated analytics', () => {
 const s = fresh(); const b = booking(s)
 for (const status of ['unknown', 'refunded', 'failed', undefined]) { const old = { schemaVersion: 1, revision: 0, inventory: s.inventory, bookings: [{ ...b, paymentStatus: status }], activity: [] }; assert.equal(migrateCommerce(old).transactions.length, 0) }
 const migrated = migrateCommerce({ schemaVersion: 1, revision: 0, inventory: s.inventory, bookings: [{ ...b, paymentStatus: 'paid', paidAmount: 100 }], activity: [] })
 assert.equal(migrated.transactions[0].dateEstimated, true); assert.equal(paymentSummary(b, migrated.transactions).payments, 100); assert.equal(analytics(migrated, reportingRange('today', at(20)), at(20)).payments, 0)
 assert.equal(migrated.orders[0].unverified, true)
})
test('legacy fulfilled orders stay delivered and cannot be replayed; recurring fixtures are never migrated', () => {
 const s = fresh(); const b = booking(s)
 const migrated = migrateCommerce({ schemaVersion: 1, revision: 0, inventory: s.inventory, bookings: [{ ...b, foodOrderStatus: 'fulfilled' }], activity: [] })
 assert.equal(migrated.orders[0].status, 'delivered'); assert.equal(migrated.orders[0].legacy, true); assert.equal(migrated.transactions.length, 0)
})
test('IST reporting boundaries include local midnight and exclude next midnight', () => {
 const range = reportingRange('today', at(20)); assert.equal(new Date(range.start).toISOString(), '2030-01-01T18:30:00.000Z'); assert.equal(new Date(range.end).toISOString(), '2030-01-02T18:30:00.000Z')
 assert.equal(reportingRange('7', at(20)).from, '2029-12-27'); assert.equal(reportingRange('30', at(20)).from, '2029-12-04')
 assert.throws(() => reportingRange('custom', at(20), { from: '2030-02-30', to: '2030-03-01' })); assert.throws(() => reportingRange('custom', at(20), { from: '2030-01-02', to: '2030-01-01' }))
 const s = fresh(); const b = booking(s); payment(s, b, 100, {}, range.start); payment(s, b, 100, {}, range.end)
 assert.equal(analytics(s, range, range.end + 1).payments, 100)
})
test('analytics distinguishes booked value, receipts, refunds and food value without double counting', () => {
 const s = fresh(); const b = booking(s); payment(s, b, 300); payment(s, b, 50, { type: 'refund' }); payment(s, b, 100, { status: 'pending' })
 const report = analytics(s, reportingRange('today', at(20)), at(20))
 assert.equal(report.bookedValue, 440); assert.equal(report.foodSales, 240); assert.equal(report.payments, 300); assert.equal(report.refunds, 50); assert.equal(report.net, 250); assert.equal(report.outstanding, 190)
 assert.equal(report.popularFood[0].quantity, 2); assert.equal(report.frequentStations[0].count, 1)
})
test('cancelled orders excluded from food sales, cancelled bookings excluded from booked value, receipts retained', () => {
 const s = fresh(); const b = booking(s); payment(s, b, 100); act(s, 'booking.cancel', b.id, { reason: 'Cancel' }); act(s, 'order.status', s.orders[0].id, { status: 'cancelled' })
 const report = analytics(s, reportingRange('today', at(20)), at(20)); assert.equal(report.cancelled, 1); assert.equal(report.bookedValue, 0); assert.equal(report.foodSales, 0); assert.equal(report.payments, 100)
})
test('occupancy requires explicit actual start and utilization clips real time to elapsed lounge hours', () => {
 const s = fresh(); const b = booking(s, { addOns: [] }); let report = analytics(s, reportingRange('today', at(17)), at(17))
 assert.equal(report.zoneOccupancy[0].occupied, 0); assert.equal(report.stationUtilization[0].hours, 0)
 act(s, 'session.start', b.id, {}, at(16)); report = analytics(s, reportingRange('today', at(17)), at(17))
 assert.equal(report.zoneOccupancy[0].occupied, 1); assert.equal(report.stationUtilization.find((row) => row.id === 'ps-01').hours, 1)
 act(s, 'session.end', b.id, {}, at(17)); report = analytics(s, reportingRange('today', at(18)), at(18)); assert.equal(report.zoneOccupancy[0].occupied, 0); assert.equal(report.stationUtilization[0].hours, 1)
})
test('empty analytics does not invent revenue, occupancy or trends from fixtures', () => {
 const report = analytics(fresh(), reportingRange('today', at(14)), at(14))
 for (const field of ['totalBookings', 'bookedValue', 'payments', 'refunds', 'outstanding', 'foodSales']) assert.equal(report[field], 0)
 assert.deepEqual(report.popularFood, []); assert.equal(report.zoneOccupancy.every((zone) => zone.occupied === 0), true)
})
test('customer directory preserves account identity and never merges same-name walk-ins', () => {
 const s = fresh(); booking(s); booking(s, { stationId: 'ps-03' }); booking(s, { stationId: 'ps-04', source: 'walk-in', userId: 'walk-in', customerName: 'Alex' }); booking(s, { stationId: 'ps-05', source: 'walk-in', userId: 'walk-in', customerName: 'Alex' })
 const people = customerDirectory(s, at(10)); assert.equal(people.length, 3); assert.equal(people.find((p) => !p.walkIn).bookings.length, 2); assert.equal(people.filter((p) => p.walkIn).length, 2)
})
test('settings validate display configuration and never change operational rules or reservations', () => {
 const s = fresh(); const b = booking(s); const previous = structuredClone(b)
 act(s, 'settings.save', undefined, { displayName: 'New Lounge', contact: 'Demo contact', cancellationPolicy: 'Review separately.' }); assert.deepEqual(s.bookings[0], previous)
 assert.throws(() => act(s, 'settings.save', undefined, { displayName: '', contact: '', cancellationPolicy: '' }))
})
test('malformed or unsupported repository versions, bad orders, ledgers and menus fail safely', () => {
 storage.clear(); const s = fresh(); const b = booking(s)
 for (const patch of [{ schemaVersion: 99 }, { menu: [{ ...menuItem, price: -1 }] }, { orders: [] }, { settings: {} }, { transactions: [{ id: 'invalid' }] }]) { storage.set(REPOSITORY_KEY, JSON.stringify({ ...s, ...patch })); assert.throws(readRepository, /could not be read/) }
 const refund = { id: 'r', bookingId: b.id, type: 'refund', amount: 1, status: 'successful', method: 'cash', at: at(10), adminId: admin.id, note: '', reference: '' }
 assert.equal(validateRepository({ ...s, transactions: [refund] }), false)
})
test('atomic booking+order writes, failed mutations and failed quota writes preserve all saved data', async () => {
 storage.clear(); storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-customer' }))
 const date = localDate(Date.now(), 1)
 const b = await reserveDemo({ stationId: 'ps-01', date, hour: 16, duration: 1, addOns: [addon] }, 'demo-customer')
 const saved = readRepository(); assert.equal(saved.orders.length, 1); assert.equal(saved.orders[0].bookingId, b.id)
 const original = storage.get(REPOSITORY_KEY); storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-admin' }))
 await assert.rejects(runAdmin({ type: 'payment.record', id: b.id, values: { amount: -1 } })); assert.equal(storage.get(REPOSITORY_KEY), original)
 const write = localStorage.setItem; localStorage.setItem = () => { throw new Error('quota') }
 try { await assert.rejects(runAdmin({ type: 'menu.archive', id: 'fries' }), /Could not save/) } finally { localStorage.setItem = write }
 assert.equal(storage.get(REPOSITORY_KEY), original)
})
test('shared events and cross-tab repository reads include menu changes and all admin authorization checks remain', async () => {
 storage.clear(); storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-admin' })); let seen
 const listener = () => { seen = readRepository() }; window.addEventListener(REPOSITORY_EVENT, listener)
 await runAdmin({ type: 'menu.save', values: menuItem }); assert.equal(seen.menu.at(-1).id, menuItem.id)
 const other = structuredClone(seen); other.menu.at(-1).price = 250; other.revision++; storage.set(REPOSITORY_KEY, JSON.stringify(other)); assert.equal(isRepositoryStorageEvent({ type: 'storage', key: REPOSITORY_KEY }), true); assert.equal(readRepository().menu.at(-1).price, 250)
 storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-customer' })); await assert.rejects(runAdmin({ type: 'menu.archive', id: menuItem.id }), /administrator/)
 window.removeEventListener(REPOSITORY_EVENT, listener)
})
test('commerce overview excludes fixtures, flags cancelled orders, and CSV escapes spreadsheet formulas', () => {
 const s = fresh(); const b = booking(s); payment(s, b, 100); const summary = commerceSnapshot(s, at(20)); assert.equal(summary.collectedToday, 100); assert.equal(summary.outstanding, 340)
 assert.equal(csvText(['Name'], [['=SUM(A1)'], ['a"b']]), '"Name"\r\n"\'=SUM(A1)"\r\n"a""b"')
})

test('concurrent payment attempts serialize and recheck the current outstanding balance', async () => {
 storage.clear(); storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-admin' }))
 const s = fresh(); const b = booking(s); storage.set(REPOSITORY_KEY, JSON.stringify(s))
 let tail = Promise.resolve()
 Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_key, callback) => { const next = tail.then(callback); tail = next.catch(() => {}); return next } } })
 try {
  const values = { amount: 300, type: 'payment', method: 'cash', status: 'successful', note: '', reference: '' }
  const results = await Promise.allSettled([runAdmin({ type: 'payment.record', id: b.id, values }), runAdmin({ type: 'payment.record', id: b.id, values })])
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1); assert.equal(readRepository().transactions.length, 1); assert.equal(paymentSummary(b, readRepository().transactions).outstanding, 140)
 } finally { delete navigator.locks }
})
test('failed first migration mutation retains the exact Phase 3B envelope and schema downgrade is rejected', async () => {
 storage.clear(); storage.set(AUTH_KEY, JSON.stringify({ id: 'demo-admin' }))
 const legacy = { schemaVersion: 1, revision: 20, inventory: defaultInventory(), bookings: [], activity: [] }; const raw = JSON.stringify(legacy); storage.set(REPOSITORY_KEY, raw)
 await assert.rejects(runAdmin({ type: 'menu.save', values: { ...menuItem, price: -1 } })); assert.equal(storage.get(REPOSITORY_KEY), raw)
 await assert.rejects(transact((state) => { state.schemaVersion = 1 }), /invalid demo data/); assert.equal(storage.get(REPOSITORY_KEY), raw)
})
test('analytics retains archived-station booking frequency and excludes fixture order counts in shared operational snapshots', async () => {
 const { operationalSnapshot } = await import('./adminSelectors.js')
 const s = fresh(); const b = booking(s); s.inventory.stations.find((station) => station.id === b.stationId).archived = true
 const report = analytics(s, reportingRange('today', at(20)), at(20)); assert.equal(report.frequentStations[0].count, 1); assert.match(report.frequentStations[0].name, /archived/)
 const snapshot = operationalSnapshot(s.bookings, at(14), s.inventory, s); assert.equal(snapshot.foodOrders.length, 1); assert.equal(snapshot.foodOrders[0].fixture, undefined); assert.equal(snapshot.revenue, 0)
})

test('migration cannot be rerun against an existing version-2 menu or ledger', () => {
 const state = fresh(); const b = booking(state); payment(state, b, 100)
 assert.throws(() => migrateCommerce(state), /must be retained/)
 assert.equal(state.transactions.length, 1); assert.equal(state.menu.length, 10)
})
