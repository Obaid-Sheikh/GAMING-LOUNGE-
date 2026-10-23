import { useState } from 'react'
import { Link } from 'react-router'
import Button from '../Button'
import ManagementDialog from './ManagementDialog'
import StatusBadge from './StatusBadge'
import { runAdmin } from '../../lib/adminManagement'
import { money } from '../../data/bookingCatalog'
import { formatDate, formatTime } from '../../lib/bookingRules'
import { paymentSummary, PAYMENT_METHODS, ORDER_NEXT } from '../../lib/commerceSchema'
import { orderNeedsReview } from '../../lib/commerceSelectors'

export function CommerceAction({ title, operation, onClose, onSaved, children }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event) { event.preventDefault(); setPending(true); setError(''); try { await runAdmin(operation); onSaved?.(); onClose() } catch (error) { setError(error.message) } finally { setPending(false) } }
  return <ManagementDialog title={title} onClose={onClose}><form className="ops-form" onSubmit={submit}>{children}<p className="ops-confirmation-note">Review this change before applying it to the shared demo data.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="ops-form-actions"><Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Confirm change'}</Button><Button variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button></div></form></ManagementDialog>
}
export function PaymentForm({ booking, transactions, revision, onClose }) {
  const summary = paymentSummary(booking, transactions)
  const [values, setValues] = useState({ amount: '', method: 'cash', type: 'payment', status: 'successful', note: '', reference: '' })
  const [openedRevision] = useState(revision)
  const [error, setError] = useState('')
  const [review, setReview] = useState(false)
  const [pending, setPending] = useState(false)
  const change = (patch) => { setValues((old) => ({ ...old, ...patch })); setReview(false); setError('') }
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!review) { setReview(true); return }
    setPending(true)
    try { await runAdmin({ type: 'payment.record', id: booking.id, values: { ...values, amount: Number(values.amount) }, expectedRevision: openedRevision }); onClose() } catch (error) { setError(error.message); setReview(false) } finally { setPending(false) }
  }
  return <ManagementDialog title="Record mock transaction" onClose={onClose}><form className="ops-form" onSubmit={submit}><p className="ops-confirmation-note">Demonstration only. No actual money is collected or returned. Never enter payment credentials.</p><p>{booking.stationId.toUpperCase()} / Booking {booking.id}</p><p>Booking total: {money(booking.price)} ? Outstanding: {money(summary.outstanding)} ? Refundable: {money(summary.net)}</p><div className="ops-form-grid"><label>Transaction type<select value={values.type} onChange={(e) => change({ type: e.target.value })}><option value="payment">Payment</option><option value="refund">Refund</option></select></label><label>Amount (INR)<input type="number" required min="0.01" step="0.01" max={Math.max(0, values.type === 'refund' ? summary.net : summary.outstanding)} value={values.amount} onChange={(e) => change({ amount: e.target.value })} /></label><label>Method<select value={values.method} onChange={(e) => change({ method: e.target.value })}>{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label><label>Transaction status<select value={values.status} onChange={(e) => change({ status: e.target.value })}>{['successful', 'pending', 'failed'].map((status) => <option key={status}>{status}</option>)}</select></label></div><label>Reference (optional)<input maxLength={150} value={values.reference} onChange={(e) => change({ reference: e.target.value })} /></label><label>Note (optional)<textarea maxLength={500} value={values.note} onChange={(e) => change({ note: e.target.value })} /></label>{review && <p className="ops-confirmation-note" role="status">Confirm explicit mock {values.type}: {money(Number(values.amount))}, {values.method}, {values.status}. This will append a permanent ledger record.</p>}{error && <p role="alert" className="form-error">{error}</p>}<div className="ops-form-actions"><Button type="submit" disabled={pending}>{pending ? 'Saving...' : review ? 'Confirm mock transaction' : 'Review mock transaction'}</Button><Button variant="secondary" onClick={onClose}>Cancel</Button></div></form></ManagementDialog>
}
export function OrderActions({ order, data }) {
  const [next, setNext] = useState(null)
  const [revision, setRevision] = useState(data.revision)
  const cancelledBooking = orderNeedsReview(order, data.bookings)
  return <><div className="ops-form-actions">{ORDER_NEXT[order.status].filter((status) => !cancelledBooking || status === 'cancelled').map((status) => <Button variant="secondary" key={status} onClick={() => { setRevision(data.revision); setNext(status) }}>{status === 'cancelled' ? 'Cancel food order' : `Mark ${status}`}</Button>)}</div>{next && <CommerceAction title="Update food order" operation={{ type: 'order.status', id: order.id, values: { status: next }, expectedRevision: revision }} onClose={() => setNext(null)}><p>Order {order.id}: {order.status} to {next}. This does not change booking charges or issue a refund.</p></CommerceAction>}</>
}
export function TransactionList({ transactions }) {
  return transactions.length ? <ul className="ops-commerce-list">{[...transactions].reverse().map((tx) => <li key={tx.id}><div><strong>{tx.type === 'refund' ? 'Refund' : 'Payment'} / {money(tx.amount)}</strong><small className="ops-wrap">{tx.id}</small><Link className="ops-text-link ops-wrap" to={`/admin/bookings/${tx.bookingId}`}>Booking {tx.bookingId}</Link><small>{formatDate(tx.at)} / {formatTime(tx.at)} IST{tx.dateEstimated && ' / Estimated legacy date; excluded from dated reports'}</small><small>{tx.method} / {tx.adminId}</small>{tx.reference && <small>Reference: {tx.reference}</small>}{tx.note && <small>{tx.note}</small>}</div><StatusBadge status={tx.status} /></li>)}</ul> : <p className="ops-muted">No transactions recorded.</p>
}
