import { useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router'
import { bookingStatus, demoReservationsForDate, formatDate, formatTime, localDate, startOfSlot } from '../../lib/bookingRules'
import { customerName, paymentStatus } from '../../lib/adminSelectors'
import { money } from '../../data/bookingCatalog'
import { orderedZones } from '../../lib/inventory'
import Button from '../../components/Button'
import WalkInForm from '../../components/admin/WalkInForm'
import ActivityLog from '../../components/admin/ActivityLog'

export default function AdminBookingsPage() {
  const { bookings, inventory, activity, now } = useOutletContext()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('station') ?? '')
  const [status, setStatus] = useState('all')
  const [zone, setZone] = useState('all')
  const [date, setDate] = useState('')
  const [order, setOrder] = useState('asc')
  const [walkIn, setWalkIn] = useState(false)
  const fixtureDate = Number.isFinite(startOfSlot(date, 10)) ? date : localDate(now)
  const records = [...bookings, ...demoReservationsForDate(fixtureDate, inventory)]
  const matches = records.filter((booking) => `${booking.id} ${customerName(booking)} ${booking.stationId}`.toLowerCase().includes(search.toLowerCase()) && (zone === 'all' || booking.zoneId === zone) && (!date || localDate(booking.start) === date) && (status === 'all' || (status === 'saved' ? !booking.fixture : status === 'walk-in' ? booking.source === 'walk-in' : bookingStatus(booking, now).toLowerCase() === status))).sort((a, b) => order === 'asc' ? a.start - b.start : b.start - a.start)
  return <><div className="ops-management-toolbar"><p className="ops-muted">{matches.length} reservations / Read-only fixtures are labeled separately.</p><Button onClick={() => setWalkIn(true)}>Create walk-in booking</Button></div><div className="ops-filters"><label>Search bookings<input type="search" placeholder="Reference, customer, or station" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{['all', 'saved', 'walk-in', 'upcoming', 'awaiting start', 'in progress', 'completed', 'cancelled', 'pending'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Zone<select value={zone} onChange={(event) => setZone(event.target.value)}><option value="all">All zones</option>{orderedZones(inventory).map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label>Session date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Sort by start<select value={order} onChange={(event) => setOrder(event.target.value)}><option value="asc">Earliest first</option><option value="desc">Latest first</option></select></label></div>
    <div className="ops-booking-management-list">{matches.map((booking) => <article className="ops-panel" key={booking.id}><div className="ops-resource-title"><h2>{booking.stationId.toUpperCase()}</h2><span className="ops-badge">{bookingStatus(booking, now)}</span></div><p className="ops-wrap"><Link className="ops-record-link" to={`/admin/bookings/${booking.id}`}>{booking.id}</Link></p><p>{customerName(booking)} / {booking.fixture ? 'Fixture / read-only' : booking.source === 'walk-in' ? 'Walk-in' : 'Customer reservation'}</p><p className="ops-muted">{inventory.zones.find((zone) => zone.id === booking.zoneId)?.name} / {formatDate(booking.start)} / {formatTime(booking.start)} to {formatTime(booking.end)} IST / {booking.duration} hour(s)</p><p>{money(booking.price)} / Booking: {booking.status} / Payment: {paymentStatus(booking)}</p><Link className="button button-secondary" to={`/admin/bookings/${booking.id}`}>Booking details</Link></article>)}</div>{!matches.length && <p className="ops-empty">No reservations match these filters.</p>}<ActivityLog activity={activity} />{walkIn && <WalkInForm inventory={inventory} bookings={bookings} onClose={() => setWalkIn(false)} />}</>
}
