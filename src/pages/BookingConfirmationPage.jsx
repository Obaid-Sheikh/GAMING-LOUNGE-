import { useParams } from 'react-router'
import CustomerPage from '../components/CustomerPage'
import Button from '../components/Button'
import BookingSummary from '../components/booking/BookingSummary'
import { useAuth } from '../context/authContext'
import { bookingStatus } from '../lib/bookingRules'
import useBookings from '../hooks/useBookings'
import useNow from '../hooks/useNow'

export default function BookingConfirmationPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { bookings, error } = useBookings()
  const now = useNow()
  const booking = bookings.find((item) => item.id === id && item.userId === user.id)
  const status = booking ? bookingStatus(booking, now) : ''
  return <CustomerPage eyebrow="YOUR SESSION / DEMO RESERVATION" title={booking ? status === 'Cancelled' ? 'Demo reservation cancelled.' : 'Your demo session is saved.' : 'Booking not found.'}>
    {error && <p className="form-error" role="alert">{error}</p>}
    {booking ? <section className="customer-panel confirmation-panel"><p className="booking-badge">{status} · Demo only</p><p className="muted-copy">Saved in this browser. This is not a real lounge reservation, and no payment has been collected.</p><BookingSummary booking={booking} /><div className="flex flex-wrap gap-3"><Button to="/my-bookings">Manage my bookings ↗</Button><Button to={`/booking?zone=${booking.zoneId}`} variant="secondary">Book another demo session</Button></div></section> : <div className="customer-panel empty-state"><p>This reference is not available in your browser’s demo history.</p><Button to="/my-bookings">View my bookings ↗</Button></div>}
  </CustomerPage>
}
