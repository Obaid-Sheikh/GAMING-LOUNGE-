import { AUTH_KEY, BOOKINGS_KEY, readStored, writeStored } from './demoStorage.js'
import { defaultInventory, validateInventory, text } from './inventory.js'
import { normalizeBooking, validBookings } from './bookingSchema.js'
import { migrateCommerce, validCommerce, syncBookingOrders } from './commerceSchema.js'
import { resolveDemoSession } from './demoAuth.js'

export const REPOSITORY_KEY = 'gaming-lounge:repository:v1'
export const REPOSITORY_EVENT = 'demo-lounge-changed'
export function validateRepository(value) {
  try {
    if (!value || ![1, 2].includes(value.schemaVersion) || !Number.isInteger(value.revision) || value.revision < 0 || !validateInventory(value.inventory) || !validBookings(value.bookings, value.inventory) || !Array.isArray(value.activity)) return false
    return (value.schemaVersion === 1 || validCommerce(value)) && value.activity.every((event) => event && text(event.id) && text(event.action) && Number.isFinite(event.at) && text(event.adminId) && text(event.target) && event.before !== undefined && event.after !== undefined)
  } catch { return false }
}
export function readRepository() {
  const inventory = defaultInventory()
  if (typeof localStorage === 'undefined') return migrateCommerce({ schemaVersion: 1, revision: 0, inventory, bookings: [], activity: [] })
  const saved = readStored(REPOSITORY_KEY, null, validateRepository)
  if (saved) {
    const normalized = { ...saved, bookings: saved.bookings.map(normalizeBooking) }
    const result = saved.schemaVersion === 1 ? migrateCommerce(normalized) : normalized
    if (!validateRepository(result)) throw new Error('Migrated demo data is invalid. Nothing was saved.')
    return result
  }
  // A read never seeds or rewrites storage. The original booking key remains a migration backup.
  const bookings = readStored(BOOKINGS_KEY, [], (items) => validBookings(items, inventory)).map(normalizeBooking)
  const result = migrateCommerce({ schemaVersion: 1, revision: 0, inventory, bookings, activity: [] })
  if (!validateRepository(result)) throw new Error('Migrated demo data is invalid. Nothing was saved.')
  return result
}
export const readInventory = () => readRepository().inventory
export function requireAdmin() {
  const session = readStored(AUTH_KEY, null, (value) => typeof value?.id === 'string')
  const user = resolveDemoSession(session)
  if (user?.role !== 'admin') throw new Error('A demo administrator session is required.')
  return user
}
export function audit(state, admin, action, target, before, after, at) {
  const scrub = (value) => value == null ? null : JSON.parse(JSON.stringify(value, (key, item) => key === 'customerContact' ? undefined : item))
  state.activity.unshift({ id: crypto.randomUUID(), action, at, adminId: admin.id, target, before: scrub(before), after: scrub(after) })
}
export async function transact(change) {
  const update = () => {
    const state = structuredClone(readRepository())
    const result = change(state)
    syncBookingOrders(state)
    state.revision += 1
    if (state.schemaVersion !== 2 || !validateRepository(state)) throw new Error('The change produced invalid demo data. Nothing was saved.')
    writeStored(REPOSITORY_KEY, state)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(REPOSITORY_EVENT))
      window.dispatchEvent(new Event('demo-bookings-changed'))
    }
    return result
  }
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(REPOSITORY_KEY, async () => update()) : update()
}
export function isRepositoryStorageEvent(event) {
  return event.type !== 'storage' || event.key === REPOSITORY_KEY || event.key === BOOKINGS_KEY || event.key === null
}
