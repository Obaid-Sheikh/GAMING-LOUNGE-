import { localDate, startOfSlot, isSessionActive } from './bookingRules.js'
import { paymentSummary, roundMoney } from './commerceSchema.js'
import { customerName } from './adminSelectors.js'

export function reportingRange(preset, now = Date.now(), custom = {}) {
  const today = localDate(now)
  const from = preset === 'custom' ? custom.from : localDate(now, preset === '7' ? -6 : preset === '30' ? -29 : 0)
  const to = preset === 'custom' ? custom.to : today
  const start = startOfSlot(from ?? '', 0), last = startOfSlot(to ?? '', 0)
  if (!Number.isFinite(start) || !Number.isFinite(last) || last < start || last - start > 366 * 86400000) throw new Error('Choose an ordered date range of up to 367 days.')
  return { from, to, start, end: last + 86400000 }
}
export const orderNeedsReview = (order, bookings) => !['delivered', 'cancelled'].includes(order.status) && bookings.find((booking) => booking.id === order.bookingId)?.status === 'cancelled'
export function commerceSnapshot(state, now = Date.now()) {
  const summaries = state.bookings.map((booking) => ({ booking, ...paymentSummary(booking, state.transactions) }))
  const transactions = state.transactions.filter((tx) => tx.at <= now && localDate(tx.at) === localDate(now) && !tx.dateEstimated)
  return { summaries, unpaid: summaries.filter((item) => item.outstanding > 0 && item.booking.status !== 'cancelled'), outstanding: roundMoney(summaries.filter((item) => item.booking.status !== 'cancelled').reduce((sum, item) => sum + Math.max(0, item.outstanding), 0)), collectedToday: roundMoney(transactions.filter((tx) => tx.type === 'payment' && tx.status === 'successful').reduce((sum, tx) => sum + tx.amount, 0)), refundsToday: roundMoney(transactions.filter((tx) => tx.type === 'refund' && tx.status === 'successful').reduce((sum, tx) => sum + tx.amount, 0)), pendingOrders: state.orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)) }
}
export function analytics(state, range, now = Date.now()) {
  const inRange = (at) => at >= range.start && at < range.end
  const bookings = state.bookings.filter((booking) => !booking.fixture && inRange(booking.start))
  const valid = bookings.filter((booking) => booking.status !== 'cancelled')
  const transactions = state.transactions.filter((tx) => !tx.dateEstimated && tx.at <= now && inRange(tx.at) && tx.status === 'successful')
  const payments = roundMoney(transactions.filter((tx) => tx.type === 'payment').reduce((sum, tx) => sum + tx.amount, 0))
  const refunds = roundMoney(transactions.filter((tx) => tx.type === 'refund').reduce((sum, tx) => sum + tx.amount, 0))
  const outstanding = roundMoney(valid.reduce((sum, booking) => sum + Math.max(0, paymentSummary(booking, state.transactions).outstanding), 0))
  const stations = state.inventory.stations.filter((station) => !station.archived)
  const elapsedEnd = Math.min(range.end, now)
  let openMs = 0
  for (let day = range.start; day < elapsedEnd; day += 86400000) openMs += Math.max(0, Math.min(day + 22 * 3600000, elapsedEnd) - Math.max(day + 10 * 3600000, range.start))
  const stationUtilization = stations.map((station) => {
    // Only recorded actual session time, clipped to operating hours and elapsed reporting period.
    let used = 0
    for (const booking of state.bookings.filter((b) => b.stationId === station.id && b.actualStart !== undefined && b.status !== 'cancelled')) {
      for (let day = range.start; day < elapsedEnd; day += 86400000) used += Math.max(0, Math.min(booking.actualEnd ?? now, day + 22 * 3600000, elapsedEnd) - Math.max(booking.actualStart, day + 10 * 3600000, range.start))
    }
    return { id: station.id, name: station.name, count: valid.filter((b) => b.stationId === station.id).length, hours: used / 3600000, percent: openMs ? Math.min(100, used / openMs * 100) : 0 }
  })
  const zoneOccupancy = state.inventory.zones.map((zone) => {
    const eligible = stations.filter((station) => station.zoneId === zone.id && station.active && zone.active && !zone.archived && !state.inventory.maintenance.some((m) => m.stationId === station.id && m.endedAt === undefined))
    const occupied = eligible.filter((station) => state.bookings.some((booking) => booking.stationId === station.id && booking.actualStart !== undefined && isSessionActive(booking, now))).length
    return { id: zone.id, name: zone.name, occupied, total: eligible.length, percent: eligible.length ? occupied / eligible.length * 100 : 0 }
  })
  const foods = new Map()
  const orders = state.orders.filter((order) => order.status !== 'cancelled' && inRange(order.createdAt))
  for (const order of orders) for (const item of order.items) { const old = foods.get(item.id) ?? { id: item.id, name: item.name, quantity: 0, value: 0 }; old.quantity += item.quantity; old.value = roundMoney(old.value + item.quantity * item.unitPrice); foods.set(item.id, old) }
  return { totalBookings: bookings.length, confirmed: bookings.filter((b) => b.status === 'confirmed').length, cancelled: bookings.filter((b) => b.status === 'cancelled').length, walkIns: bookings.filter((b) => b.source === 'walk-in').length, bookedValue: roundMoney(valid.reduce((sum, b) => sum + b.price, 0)), payments, refunds, net: roundMoney(payments - refunds), outstanding, foodSales: roundMoney(orders.reduce((sum, order) => sum + order.total, 0)), popularFood: [...foods.values()].sort((a, b) => b.quantity - a.quantity), stationUtilization, zoneOccupancy, frequentStations: state.inventory.stations.map((station) => ({ id: station.id, name: station.name + (station.archived ? ' (archived)' : ''), count: valid.filter((booking) => booking.stationId === station.id).length })).sort((a, b) => b.count - a.count), estimatedPayments: state.transactions.filter((tx) => tx.dateEstimated).length }
}
export function customerDirectory(state, now = Date.now()) {
  const people = new Map()
  for (const booking of state.bookings) {
    const key = booking.source === 'walk-in' || booking.userId === 'walk-in' ? `walk-in:${booking.id}` : booking.userId
    const row = people.get(key) ?? { id: key, name: customerName(booking), walkIn: key.startsWith('walk-in:'), bookings: [], upcoming: 0, completed: 0, value: 0, paid: 0, refunds: 0, outstanding: 0 }
    row.bookings.push(booking)
    if (['confirmed', 'pending'].includes(booking.status) && booking.start > now) row.upcoming++
    if (booking.status === 'completed' || booking.actualEnd !== undefined) row.completed++
    const summary = paymentSummary(booking, state.transactions)
    row.value = roundMoney(row.value + booking.price); row.paid = roundMoney(row.paid + summary.payments); row.refunds = roundMoney(row.refunds + summary.refunds); row.outstanding = roundMoney(row.outstanding + summary.outstanding)
    people.set(key, row)
  }
  return [...people.values()]
}
export function csvText(headers, rows) {
  const cell = (value) => { const text = String(value ?? ''); return '"' + (/^(\s*[=+@-]|[\t\r])/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"' }
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}
