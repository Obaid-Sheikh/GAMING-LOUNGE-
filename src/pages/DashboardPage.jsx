import CustomerPage from '../components/CustomerPage'
import Button from '../components/Button'
import BookingCard from '../components/booking/BookingCard'
import { useAuth } from '../context/authContext'
import { stations } from '../data/bookingCatalog'
import { formatDate, formatTime } from '../lib/bookingRules'
import useBookings from '../hooks/useBookings'
import useNow from '../hooks/useNow'

export default function DashboardPage() {
  const { user } = useAuth()
  const { bookings, error } = useBookings()
  const now = useNow()
  const mine = bookings.filter((item) => item.userId === user.id)
  const upcoming = mine.filter((item) => item.status === 'confirmed' && item.end > now).sort((a, b) => a.start - b.start)
  const activity = mine.flatMap((booking) => [
    { id: `${booking.id}-created`, station: booking.stationId, time: booking.createdAt, label: 'Demo reservation created' },
    ...(booking.cancelledAt ? [{ id: `${booking.id}-cancelled`, station: booking.stationId, time: booking.cancelledAt, label: 'Demo reservation cancelled' }] : []),
  ]).sort((a, b) => b.time - a.time).slice(0, 5)

  return <CustomerPage eyebrow="PLAYER HOME / READY WHEN YOU ARE" title={`Welcome, ${user.name}.`} actions={<Button to="/booking">Create a demo booking ↗</Button>}>
    <div className="profile-strip"><span className="player-avatar" aria-hidden="true">DP</span><div><strong>{user.name}</strong><p>{user.email} · Demo customer</p></div></div>
    {error ? <p role="alert" className="form-error">{error}</p> : <><div className="grid gap-4 sm:grid-cols-3 dashboard-stats"><div className="customer-panel"><span>{upcoming.length}</span><p>Upcoming / active sessions</p></div><div className="customer-panel"><span>{mine.filter((item) => item.status === 'confirmed' && item.end <= now).length}</span><p>Completed demo sessions</p></div><div className="customer-panel"><span>{mine.filter((item) => item.status === 'cancelled').length}</span><p>Cancelled demo sessions</p></div></div><div className="dashboard-columns"><section className="booking-group"><div className="section-title-row"><h2>Next sessions</h2><Button to="/my-bookings" variant="secondary">Booking history ↗</Button></div><div className="booking-list">{upcoming.length ? upcoming.slice(0, 3).map((booking) => <BookingCard key={booking.id} booking={booking} now={now} />) : <div className="customer-panel empty-state"><h3>Room for your next adventure.</h3><p>Choose a zone and build your first demo session.</p><Button to="/booking">Explore demo availability ↗</Button></div>}</div></section><section className="booking-group" aria-labelledby="activity-title"><h2 id="activity-title">Recent activity</h2><div className="customer-panel">{activity.length ? <ol className="activity-list">{activity.map((item) => <li key={item.id}><strong>{item.label}</strong><p>{stations.find((station) => station.id === item.station).name}</p><time dateTime={new Date(item.time).toISOString()}>{formatDate(item.time)} · {formatTime(item.time)} IST</time></li>)}</ol> : <p className="muted-copy">No activity yet. Your demo reservations and cancellations will appear here.</p>}</div></section></div></>}
  </CustomerPage>
}
