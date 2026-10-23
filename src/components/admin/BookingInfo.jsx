import useLoungeData from '../../hooks/useLoungeData'
import { useState } from 'react'
import Button from '../Button'
import { Link } from 'react-router'
import { paymentSummary } from '../../lib/commerceSchema'
import { PaymentForm, TransactionList } from './CommerceControls'
import { orderNeedsReview } from '../../lib/commerceSelectors'
import { money } from '../../data/bookingCatalog'
import { customerName, foodStatus, paymentStatus } from '../../lib/adminSelectors'
import { formatDate, formatTime } from '../../lib/bookingRules'
import BookingSummary from '../booking/BookingSummary'
import StatusBadge from './StatusBadge'

export default function BookingInfo({ booking }) {
  const data = useLoungeData()
  const [payment, setPayment] = useState(null)
  const saved = data.bookings.find((item) => item.id === booking.id)
  const summary = paymentSummary(saved ?? booking, data.transactions)
  const order = data.orders.find((item) => item.bookingId === booking.id)
  return <><div className="ops-detail-section"><h3>Reservation</h3><dl className="ops-detail-list"><div><dt>Customer</dt><dd>{customerName(booking)}</dd></div>{booking.customerContact && <div><dt>Contact (admin only)</dt><dd>{booking.customerContact}</dd></div>}
      <div><dt>Actual start</dt><dd>{booking.actualStart === undefined ? 'Not recorded' : `${formatDate(booking.actualStart)} / ${formatTime(booking.actualStart)} IST`}</dd></div><div><dt>Actual end</dt><dd>{booking.actualEnd === undefined ? 'Not recorded' : `${formatDate(booking.actualEnd)} / ${formatTime(booking.actualEnd)} IST`}</dd></div>
      {booking.cancellationReason && <div><dt>Cancellation reason</dt><dd>{booking.cancellationReason}</dd></div>}<div><dt>Source</dt><dd>{booking.fixture ? 'Recurring demo fixture' : booking.source === 'walk-in' ? 'Walk-in' : 'Saved customer booking'}</dd></div><div><dt>Booking status</dt><dd><StatusBadge status={booking.status} /></dd></div><div><dt>Payment status</dt><dd><StatusBadge status={saved ? summary.status : paymentStatus(booking)} /></dd></div><div><dt>Food order</dt><dd>{order?.status ?? foodStatus(booking)}</dd></div>{Number.isFinite(booking.paidAt) && <div><dt>Mock paid at</dt><dd>{formatDate(booking.paidAt)} / {formatTime(booking.paidAt)} IST</dd></div>}</dl>{booking.actualEnd !== undefined && <p className="ops-confirmation-note">Occupancy released. Scheduled times and charges are retained; the original interval remains reserved until its scheduled end.</p>}<BookingSummary booking={booking} /></div>
    <section className="ops-detail-section"><h3>Food &amp; beverages</h3>{booking.addOns?.length ? <ul className="ops-food-list">{booking.addOns.map((item) => <li key={item.id}><div><strong>{item.name}</strong><small>{item.quantity} &times; {money(item.unitPrice)} each</small></div><span>{money(item.quantity * item.unitPrice)}</span></li>)}</ul> : <p className="ops-muted">No food add-ons on this reservation.</p>}</section>{saved && <section className="ops-detail-section"><h3>Food order &amp; payment ledger</h3>{order ? <><p className="ops-wrap">{order.id} / {order.status}{order.unverified && ' / Legacy fulfillment unverified'}</p>{orderNeedsReview(order, data.bookings) && <p className="form-error">Cancelled booking: undelivered order needs explicit cancellation.</p>}<Link className="ops-text-link" to="/admin/orders">Manage food order</Link></> : <p className="ops-muted">No food order.</p>}<dl className="ops-detail-list"><div><dt>Successful payments</dt><dd>{money(summary.payments)}</dd></div><div><dt>Refunds</dt><dd>{money(summary.refunds)}</dd></div><div><dt>Outstanding balance</dt><dd>{money(summary.outstanding)}</dd></div></dl><Button variant="secondary" onClick={() => setPayment({ booking: saved, revision: data.revision })}>Record mock transaction</Button><TransactionList transactions={data.transactions.filter((tx) => tx.bookingId === booking.id)} /></section>}{payment && <PaymentForm booking={payment.booking} revision={payment.revision} transactions={data.transactions} onClose={() => setPayment(null)} />}</>
}
