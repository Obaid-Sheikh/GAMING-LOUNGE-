import { audit } from './mockRepository.js'
import { ORDER_NEXT, PAYMENT_METHODS, paymentSummary, validateMenuItem, validateSettings } from './commerceSchema.js'
import { finiteMoney } from './inventory.js'
export function applyCommerceOperation(state, admin, operation, now = Date.now()) {
  if (admin?.role !== 'admin') throw new Error('A demo administrator session is required.')
  const { type, id, values = {} } = operation
  if (type === 'menu.save') {
    const existing = id ? state.menu.find((item) => item.id === id) : null
    if (id && !existing) throw new Error('Menu item not found.')
    if (existing && values.id !== id) throw new Error('Menu IDs cannot change.')
    if (!existing && state.menu.some((item) => item.id === values.id)) throw new Error('Duplicate menu ID, including archived items.')
    const item = { id: values.id, name: values.name?.trim(), description: values.description?.trim(), category: values.category, price: values.price, available: values.available, archived: existing?.archived ?? false }
    validateMenuItem(item)
    const before = existing ? { ...existing } : null
    if (existing) Object.assign(existing, item); else state.menu.push(item)
    audit(state, admin, type, item.id, before, item, now)
    return item
  }
  if (['menu.archive', 'menu.restore', 'menu.availability'].includes(type)) {
    const item = state.menu.find((item) => item.id === id)
    if (!item) throw new Error('Menu item not found.')
    const before = { ...item }
    if (type === 'menu.availability') { if (typeof values.available !== 'boolean') throw new Error('Invalid availability.'); item.available = values.available }
    else item.archived = type === 'menu.archive'
    audit(state, admin, type, id, before, item, now)
    return item
  }
  if (type === 'order.status') {
    const order = state.orders.find((item) => item.id === id)
    if (!order) throw new Error('Order not found. Demo fixtures are read-only.')
    if (!ORDER_NEXT[order.status].includes(values.status)) throw new Error('Invalid order transition.')
    const booking = state.bookings.find((booking) => booking.id === order.bookingId)
    if (booking.status === 'cancelled' && values.status !== 'cancelled') throw new Error('This booking is cancelled. Cancel its undelivered order explicitly; fulfillment cannot continue.')
    const before = structuredClone(order)
    order.history.push({ from: order.status, to: values.status, at: now, adminId: admin.id })
    order.status = values.status; order.updatedAt = now; order.unverified = false
    audit(state, admin, type, id, before, order, now)
    return order
  }
  if (type === 'payment.record') {
    const booking = state.bookings.find((booking) => booking.id === id)
    if (!booking) throw new Error('Saved booking not found. Demo fixtures cannot receive payments.')
    if (!finiteMoney(values.amount) || values.amount <= 0 || !PAYMENT_METHODS.includes(values.method) || !['payment', 'refund'].includes(values.type) || !['successful', 'pending', 'failed'].includes(values.status) || typeof values.note !== 'string' || values.note.length > 500 || typeof values.reference !== 'string' || values.reference.length > 150) throw new Error('Enter a positive amount with up to two decimals, method, type, status, and valid optional notes.')
    const summary = paymentSummary(booking, state.transactions)
    if (values.type === 'payment' && (booking.status === 'cancelled' || values.amount > summary.outstanding)) throw new Error('Payments cannot exceed the outstanding balance or be added to cancelled bookings.')
    if (values.type === 'refund' && values.amount > summary.net) throw new Error('Refund exceeds the refundable amount collected.')
    const tx = { id: crypto.randomUUID(), bookingId: id, amount: values.amount, method: values.method, type: values.type, status: values.status, note: values.note.trim(), reference: values.reference.trim(), at: now, adminId: admin.id }
    state.transactions.push(tx)
    audit(state, admin, type, id, summary, tx, now)
    return tx
  }
  if (type === 'settings.save') {
    const settings = { displayName: values.displayName?.trim(), contact: values.contact?.trim(), cancellationPolicy: values.cancellationPolicy?.trim() }
    if (!validateSettings(settings)) throw new Error('Enter a lounge name, contact details up to 300 characters, and policy text up to 1,000 characters.')
    const before = { ...state.settings }; state.settings = settings
    audit(state, admin, type, 'lounge-settings', before, settings, now)
    return settings
  }
  throw new Error('Unknown commerce operation.')
}
