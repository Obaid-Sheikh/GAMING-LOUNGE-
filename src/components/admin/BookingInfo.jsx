import { money } from '../../data/bookingCatalog'
import { customerName, foodStatus, paymentStatus } from '../../lib/adminSelectors'
import { formatDate, formatTime } from '../../lib/bookingRules'
import BookingSummary from '../booking/BookingSummary'
import StatusBadge from './StatusBadge'

export default function BookingInfo({ booking }) {
  return <><div className="ops-detail-section"><h3>Reservation</h3><dl className="ops-detail-list"><div><dt>Customer</dt><dd>{customerName(booking)}</dd></div>{booking.customerContact && <div><dt>Contact (admin only)</dt><dd>{booking.customerContact}</dd></div>}
      <div><dt>Actual start</dt><dd>{booking.actualStart === undefined ? 'Not recorded' : `${formatDate(booking.actualStart)} / ${formatTime(booking.actualStart)} IST`}</dd></div><div><dt>Actual end</dt><dd>{booking.actualEnd === undefined ? 'Not recorded' : `${formatDate(booking.actualEnd)} / ${formatTime(booking.actualEnd)} IST`}</dd></div>
      {booking.cancellationReason && <div><dt>Cancellation reason</dt><dd>{booking.cancellationReason}</dd></div>}<div><dt>Source</dt><dd>{booking.fixture ? 'Recurring demo fixture' : booking.source === 'walk-in' ? 'Walk-in' : 'Saved customer booking'}</dd></div><div><dt>Booking status</dt><dd><StatusBadge status={booking.status} /></dd></div><div><dt>Payment status</dt><dd><StatusBadge status={paymentStatus(booking)} /></dd></div><div><dt>Food order</dt><dd>{foodStatus(booking)}</dd></div>{Number.isFinite(booking.paidAt) && <div><dt>Mock paid at</dt><dd>{formatDate(booking.paidAt)} / {formatTime(booking.paidAt)} IST</dd></div>}</dl>{booking.actualEnd !== undefined && <p className="ops-confirmation-note">Occupancy released. Scheduled times and charges are retained; the original interval remains reserved until its scheduled end.</p>}<BookingSummary booking={booking} /></div>
    <section className="ops-detail-section"><h3>Food &amp; beverages</h3>{booking.addOns?.length ? <ul className="ops-food-list">{booking.addOns.map((item) => <li key={item.id}><div><strong>{item.name}</strong><small>{item.quantity} &times; {money(item.unitPrice)} each</small></div><span>{money(item.quantity * item.unitPrice)}</span></li>)}</ul> : <p className="ops-muted">No food add-ons on this reservation.</p>}</section></>
}
