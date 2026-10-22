import { money } from '../../data/bookingCatalog'
import { customerName, foodStatus, paymentStatus } from '../../lib/adminSelectors'
import { formatDate, formatTime } from '../../lib/bookingRules'
import BookingSummary from '../booking/BookingSummary'
import StatusBadge from './StatusBadge'

export default function BookingInfo({ booking }) {
  return <><div className="ops-detail-section"><h3>Reservation</h3><dl className="ops-detail-list"><div><dt>Customer</dt><dd>{customerName(booking)}</dd></div><div><dt>Source</dt><dd>{booking.fixture ? 'Recurring demo fixture' : 'Saved browser booking'}</dd></div><div><dt>Booking status</dt><dd><StatusBadge status={booking.status} /></dd></div><div><dt>Payment status</dt><dd><StatusBadge status={paymentStatus(booking)} /></dd></div><div><dt>Food order</dt><dd>{foodStatus(booking)}</dd></div>{Number.isFinite(booking.paidAt) && <div><dt>Mock paid at</dt><dd>{formatDate(booking.paidAt)} / {formatTime(booking.paidAt)} IST</dd></div>}</dl><BookingSummary booking={booking} /></div>
    <section className="ops-detail-section"><h3>Food &amp; beverages</h3>{booking.addOns?.length ? <ul className="ops-food-list">{booking.addOns.map((item) => <li key={item.id}><div><strong>{item.name}</strong><small>{item.quantity} &times; {money(item.unitPrice)} each</small></div><span>{money(item.quantity * item.unitPrice)}</span></li>)}</ul> : <p className="ops-muted">No food add-ons on this reservation.</p>}</section></>
}
