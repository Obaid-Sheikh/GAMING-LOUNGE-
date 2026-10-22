import CustomerPage from '../components/CustomerPage'
import Button from '../components/Button'
import BookingCard from '../components/booking/BookingCard'
import { useAuth } from '../context/authContext'
import useBookings from '../hooks/useBookings'
import useNow from '../hooks/useNow'

export default function MyBookingsPage() {
  const { user } = useAuth()
  const { bookings, error } = useBookings()
  const now = useNow()
  const mine = bookings.filter((item) => item.userId === user.id)
  const upcoming = mine.filter((item) => ['confirmed', 'pending'].includes(item.status) && (item.end > now || item.actualStart !== undefined && item.actualEnd === undefined)).sort((a, b) => a.start - b.start)
  const previous = mine.filter((item) => ['cancelled', 'completed'].includes(item.status) || item.end <= now && !(item.actualStart !== undefined && item.actualEnd === undefined)).sort((a, b) => b.start - a.start)
  return <CustomerPage eyebrow="PLAYER HISTORY / ALL YOUR SESSIONS" title="My demo bookings." actions={<Button to="/booking">New demo booking ↗</Button>}>
    {error ? <p className="form-error" role="alert">{error}</p> : <><section className="booking-group" aria-labelledby="upcoming-title"><h2 id="upcoming-title">Upcoming & in progress <span className="count-label">{upcoming.length}</span></h2><div className="booking-list">{upcoming.length ? upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} now={now} />) : <div className="customer-panel empty-state"><h3>Your next session is waiting.</h3><p>No upcoming demo reservations yet.</p><Button to="/booking">Find a station ↗</Button></div>}</div></section><section className="booking-group" aria-labelledby="previous-title"><h2 id="previous-title">Previous & cancelled <span className="count-label">{previous.length}</span></h2><div className="booking-list">{previous.length ? previous.map((booking) => <BookingCard key={booking.id} booking={booking} now={now} />) : <div className="customer-panel empty-state"><p>No previous or cancelled demo reservations. Your history will appear here.</p></div>}</div></section></>}
  </CustomerPage>
}
