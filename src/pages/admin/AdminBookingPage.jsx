import { Link, useOutletContext, useParams } from 'react-router'
import BookingInfo from '../../components/admin/BookingInfo'

export default function AdminBookingPage() {
  const { snapshot } = useOutletContext()
  const { id } = useParams()
  const booking = snapshot.records.find((booking) => booking.id === id)
  return <section className="ops-panel ops-booking-detail"><p className="ops-eyebrow">READ-ONLY RESERVATION</p><h2>{booking ? 'Booking details' : 'Booking not found'}</h2>{booking ? <BookingInfo booking={booking} /> : <p className="ops-muted">This reference is not in the current browser records or today's demo fixtures.</p>}<p className="ops-muted">Booking management is deferred to Phase 3B.</p><Link to="/admin/floor" className="button button-secondary">Return to lounge floor</Link></section>
}
