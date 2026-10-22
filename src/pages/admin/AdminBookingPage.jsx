import { Link, useOutletContext, useParams } from 'react-router'
import { demoReservationsForDate, startOfSlot } from '../../lib/bookingRules'
import BookingInfo from '../../components/admin/BookingInfo'
import BookingActions from '../../components/admin/BookingActions'
import ActivityLog from '../../components/admin/ActivityLog'
export default function AdminBookingPage() {
  const { snapshot, inventory, activity } = useOutletContext()
  const { id } = useParams()
  const fixtureDate = /^fixture-(\d{4}-\d{2}-\d{2})-/.exec(id)?.[1]
  const fixtures = fixtureDate && Number.isFinite(startOfSlot(fixtureDate, 10)) ? demoReservationsForDate(fixtureDate, inventory) : []
  const booking = snapshot.records.find((booking) => booking.id === id) ?? fixtures.find((booking) => booking.id === id)
  return <section className="ops-panel ops-booking-detail"><p className="ops-eyebrow">{booking?.fixture ? 'READ-ONLY DEMO FIXTURE' : 'RESERVATION MANAGEMENT'}</p><h2>{booking ? 'Booking details' : 'Booking not found'}</h2>{booking ? <><BookingInfo booking={booking} /><BookingActions booking={booking} /><ActivityLog activity={activity} target={booking.id} /></> : <p className="ops-muted">This reference is not in the current browser records or demo fixtures.</p>}<Link to="/admin/bookings" className="button button-secondary">Return to bookings</Link><Link to="/admin/floor" className="button button-secondary">Return to lounge floor</Link></section>
}
