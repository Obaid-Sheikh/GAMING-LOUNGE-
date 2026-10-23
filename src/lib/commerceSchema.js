import { foodCategories, foodItems } from '../data/foodCatalog.js'
import { finiteMoney, text, unique } from './inventory.js'
import { addOnSubtotal } from './bookingSchema.js'

export const ORDER_STATES = ['placed', 'preparing', 'ready', 'delivered', 'cancelled']
export const ORDER_NEXT = { placed: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['delivered', 'cancelled'], delivered: [], cancelled: [] }
export const PAYMENT_METHODS = ['cash', 'upi', 'card', 'other']
export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100
export const defaultMenu = () => foodItems.map((item) => ({ ...item, description: '', available: true, archived: false }))
export const defaultSettings = () => ({ displayName: 'Gaming Lounge', contact: '', cancellationPolicy: 'Upcoming unstarted reservations can be cancelled. Mock refunds require a separate administrator action.' })
export function validateMenuItem(item) {
  if (!item || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(item.id) || !text(item.name, 100) || typeof item.description !== 'string' || item.description.length > 500 || !foodCategories.includes(item.category) || !finiteMoney(item.price) || typeof item.available !== 'boolean' || typeof item.archived !== 'boolean') throw new Error('Use a unique 2-40 character menu ID, a name, a known category, and a nonnegative INR price with up to two decimals.')
  return true
}
export function validateSettings(settings) {
  return settings && text(settings.displayName, 100) && typeof settings.contact === 'string' && settings.contact.length <= 300 && text(settings.cancellationPolicy, 1000)
}
export function paymentSummary(booking, transactions = []) {
  const rows = transactions.filter((item) => item.bookingId === booking.id && item.status === 'successful')
  const payments = roundMoney(rows.filter((item) => item.type === 'payment').reduce((sum, item) => sum + item.amount, 0))
  const refunds = roundMoney(rows.filter((item) => item.type === 'refund').reduce((sum, item) => sum + item.amount, 0))
  const net = roundMoney(payments - refunds)
  const outstanding = roundMoney(booking.price - net)
  const known = rows.length > 0 || ['pending', 'failed'].includes(booking.paymentStatus)
  const status = refunds > 0 && net === 0 ? 'refunded' : net > 0 && outstanding <= 0 ? 'paid' : net > 0 ? 'partial' : known ? 'unpaid' : 'unknown'
  return { payments, refunds, net, outstanding, status }
}
export function orderForBooking(booking, legacy = false) {
  const status = ({ pending: 'placed', preparing: 'preparing', fulfilled: 'delivered', cancelled: 'cancelled' })[booking.foodOrderStatus] ?? 'placed'
  return { id: `order-${booking.id}`, bookingId: booking.id, items: structuredClone(booking.addOns), total: roundMoney(addOnSubtotal(booking.addOns)), status, createdAt: booking.createdAt, legacy, unverified: legacy && !['pending', 'preparing', 'fulfilled', 'cancelled'].includes(booking.foodOrderStatus), history: [] }
}
export function migrateCommerce(state) {
  if (state.schemaVersion !== 1) throw new Error('Only Phase 3B schema version 1 can be migrated. Existing commerce data must be retained.')
  const result = structuredClone(state)
  result.schemaVersion = 2
  result.menu = defaultMenu(); result.orders = []; result.transactions = []; result.settings = defaultSettings()
  for (const booking of result.bookings) {
    if (booking.addOns?.length) result.orders.push(orderForBooking(booking, true))
    // Explicit paid metadata only. Unknown/refunded metadata cannot prove an original receipt.
    if (booking.paymentStatus === 'paid') {
      const amount = booking.paidAmount ?? booking.price
      if (amount > 0) result.transactions.push({ id: `legacy-payment-${booking.id}`, bookingId: booking.id, amount, type: 'payment', method: 'other', status: 'successful', at: Number.isFinite(booking.paidAt) ? booking.paidAt : booking.createdAt, dateEstimated: !Number.isFinite(booking.paidAt), adminId: 'legacy-import', note: 'Imported explicit legacy paid metadata once.', reference: '', legacy: true })
    }
  }
  return result
}
export function syncBookingOrders(state) {
  if (state.schemaVersion !== 2) return
  for (const booking of state.bookings) if (booking.addOns?.length && !state.orders.some((order) => order.bookingId === booking.id)) state.orders.push(orderForBooking(booking))
}
export function validCommerce(state) {
  try {
    if (!Array.isArray(state.menu) || !unique(state.menu.map((item) => item.id)) || !state.menu.every(validateMenuItem) || !validateSettings(state.settings) || !Array.isArray(state.orders) || !Array.isArray(state.transactions)) return false
    const bookingFor = (id) => state.bookings.find((booking) => booking.id === id)
    if (!unique(state.orders.map((item) => item.id)) || !unique(state.orders.map((item) => item.bookingId)) || !unique(state.transactions.map((item) => item.id))) return false
    for (const order of state.orders) {
      const booking = bookingFor(order.bookingId)
      if (!booking || !text(order.id) || !ORDER_STATES.includes(order.status) || !Number.isFinite(order.createdAt) || !Array.isArray(order.history) || typeof order.legacy !== 'boolean' || typeof order.unverified !== 'boolean' || JSON.stringify(order.items) !== JSON.stringify(booking.addOns) || !finiteMoney(order.total) || Math.abs(order.total - addOnSubtotal(booking.addOns)) > .001) return false
      if (!order.history.every((event) => event && ORDER_STATES.includes(event.from) && ORDER_NEXT[event.from].includes(event.to) && Number.isFinite(event.at) && text(event.adminId))) return false
      if (order.history.length && (order.history.at(-1).to !== order.status || order.history.some((event, i) => i > 0 && (event.from !== order.history[i - 1].to || event.at < order.history[i - 1].at)))) return false
    }
    if (state.bookings.some((booking) => booking.addOns?.length && !state.orders.some((order) => order.bookingId === booking.id))) return false
    const received = new Map()
    for (const tx of state.transactions) {
      if (!bookingFor(tx.bookingId) || !text(tx.id) || !finiteMoney(tx.amount) || tx.amount <= 0 || !['payment', 'refund'].includes(tx.type) || !PAYMENT_METHODS.includes(tx.method) || !['successful', 'pending', 'failed'].includes(tx.status) || !Number.isFinite(tx.at) || !text(tx.adminId) || typeof tx.note !== 'string' || tx.note.length > 500 || typeof tx.reference !== 'string' || tx.reference.length > 150 || (tx.dateEstimated !== undefined && typeof tx.dateEstimated !== 'boolean')) return false
      if (tx.status === 'successful') {
        const balance = roundMoney((received.get(tx.bookingId) ?? 0) + (tx.type === 'payment' ? tx.amount : -tx.amount))
        if (balance < 0) return false
        received.set(tx.bookingId, balance)
      }
    }
    return true
  } catch { return false }
}
