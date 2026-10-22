import { Link, useOutletContext } from 'react-router'
import { money } from '../../data/bookingCatalog'
import { customerName, foodQuantity, foodStatus, paymentStatus } from '../../lib/adminSelectors'
import { formatDate, formatTime } from '../../lib/bookingRules'
import DashboardPanel from '../../components/admin/DashboardPanel'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminIcon from '../../components/admin/AdminIcon'

function BookingRows({ bookings }) {
  return bookings.length ? <ul className="ops-booking-list">{bookings.map((booking) => <li key={booking.id}><div><Link to={`/admin/bookings/${booking.id}`} className="ops-record-link">{booking.stationId.toUpperCase()}<span>{customerName(booking)}</span></Link><small>{formatDate(booking.start)} / {formatTime(booking.start)} to {formatTime(booking.end)} IST</small></div><div className="ops-booking-row-meta"><strong>{money(booking.price)}</strong><StatusBadge status={booking.status} /><small>Payment: {paymentStatus(booking)}</small></div></li>)}</ul> : <p className="ops-empty">No matching reservations.</p>
}

export default function AdminOverviewPage() {
  const { snapshot } = useOutletContext()
  const stats = [
    ['Total stations', snapshot.stationViews.length, 'Across 4 gaming zones', 'neutral'],
    ['Available stations', snapshot.counts.Available, 'No active or reserved session today', 'available'],
    ['Occupied stations', snapshot.counts.Occupied, 'Confirmed sessions in progress', 'occupied'],
    ['Reserved stations', snapshot.counts.Reserved, 'Pending holds or upcoming today', 'reserved'],
    ['Under maintenance', snapshot.counts.Maintenance, 'Excluded from bookable inventory', 'maintenance'],
    ["Today's bookings", snapshot.todayBookings, 'Includes recurring demo fixtures', 'neutral'],
    ['Pending payments', snapshot.pendingPayments, 'Explicit mock pending states only', 'reserved'],
    ["Today's revenue", money(snapshot.revenue), 'Mock paid transactions today only', 'available'],
  ]
  return <>
    <section className="ops-stat-grid" aria-label="Operational summary">{stats.map(([label, value, hint, tone], index) => <article key={label} className={`ops-stat ops-stat-${tone}`}><div className="ops-stat-top"><span>{label}</span><span className="ops-stat-index">{String(index + 1).padStart(2, '0')}</span></div><strong>{value}</strong><p>{hint}</p></article>)}</section>
    <section className="ops-floor-callout"><div><span className="ops-callout-icon"><AdminIcon name="floor" size={32} /></span><div><p className="ops-eyebrow">YOUR SPACE, AT A GLANCE</p><h2>Step onto the lounge floor.</h2><p>Inspect stations, session times, payments, and food add-ons.</p></div></div><Link className="button button-primary" to="/admin/floor">Open lounge floor <AdminIcon name="arrow" /></Link></section>
    <div className="ops-dashboard-grid"><DashboardPanel title="Recent bookings" count={snapshot.recent.length} action={<Link className="ops-text-link" to="/admin/bookings">Bookings / upcoming</Link>}><BookingRows bookings={snapshot.recent} /></DashboardPanel><DashboardPanel title="Upcoming sessions" count={snapshot.upcoming.length}><BookingRows bookings={snapshot.upcoming} /></DashboardPanel>
      <DashboardPanel title="Pending food orders" count={snapshot.foodOrders.length}>{snapshot.foodOrders.length ? <ul className="ops-order-list">{snapshot.foodOrders.map((booking) => <li key={booking.id}><div><Link className="ops-record-link" to={`/admin/bookings/${booking.id}`}>{booking.stationId.toUpperCase()} / {foodQuantity(booking)} items</Link><small>{booking.addOns.map((item) => `${item.quantity} x ${item.name}`).join(', ')}</small></div><StatusBadge status={foodStatus(booking)} /></li>)}</ul> : <p className="ops-empty">No pending food orders with known fulfillment status.</p>}</DashboardPanel>
      <DashboardPanel title="Stations requiring attention" count={snapshot.attention.length}>{snapshot.attention.length ? <ul className="ops-order-list">{snapshot.attention.map((view) => <li key={view.station.id}><div><Link className="ops-record-link" to="/admin/floor">{view.station.id.toUpperCase()}</Link><small>{view.maintenance?.reason ?? 'Active session has a pending mock payment'}</small></div><StatusBadge status={view.status} /></li>)}</ul> : <p className="ops-empty">No stations currently require attention.</p>}</DashboardPanel></div>
  </>
}
