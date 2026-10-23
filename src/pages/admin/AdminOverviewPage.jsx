import useNow from '../../hooks/useNow'
import CommerceSummary from '../../components/admin/CommerceSummary'
import { commerceSnapshot } from '../../lib/commerceSelectors'
import { Link, useOutletContext } from 'react-router'
import { money } from '../../data/bookingCatalog'
import { orderedZones } from '../../lib/inventory'
import { customerName, foodQuantity, foodStatus, paymentStatus } from '../../lib/adminSelectors'
import { formatDate, formatTime } from '../../lib/bookingRules'
import DashboardPanel from '../../components/admin/DashboardPanel'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminIcon from '../../components/admin/AdminIcon'
import EmptyState from '../../components/admin/EmptyState'

function BookingRows({ bookings, upcoming = false }) {
  if (!bookings.length) return <EmptyState icon={upcoming ? 'clock' : 'bookings'} title={upcoming ? 'The schedule is clear' : 'No recent bookings'}>{upcoming ? 'Upcoming reservations will appear here as sessions are booked.' : 'New reservations will appear here when they are created.'}</EmptyState>
  return <ul className="ops-booking-list" tabIndex={bookings.length > 2 ? 0 : undefined} aria-label={upcoming ? 'Upcoming reservations' : 'Recent reservations'}>{bookings.map((booking) => <li key={booking.id}>
    <span className={`ops-booking-device ops-device-${booking.zoneId}`} aria-hidden="true"><AdminIcon name={booking.zoneId === 'pc' ? 'pc' : booking.zoneId === 'entertainment' ? 'entertainment' : 'console'} size={22} /></span>
    <div className="ops-booking-row-info"><Link to={`/admin/bookings/${booking.id}`} className="ops-record-link">{booking.stationId.toUpperCase()}<span>{customerName(booking)}</span></Link><small>{formatDate(booking.start)} <span aria-hidden="true">&middot;</span> {formatTime(booking.start)} to {formatTime(booking.end)} IST</small></div>
    <div className="ops-booking-row-meta"><strong>{money(booking.price)}</strong><StatusBadge status={booking.status} /><small>Payment: {paymentStatus(booking)}</small></div>
  </li>)}</ul>
}

export default function AdminOverviewPage() {
  const data = useOutletContext()
  const { snapshot, inventory } = data
  const clock = useNow()
  const commerce = commerceSnapshot(data, clock)
  const floorZones = orderedZones(inventory).filter((zone) => !zone.archived)
  const stats = [
    ['Total stations', snapshot.stationViews.length, `Across ${floorZones.length} gaming zones`, 'neutral', 'pc'],
    ['Available stations', snapshot.counts.Available, 'Ready for a session', 'available', 'check'],
    ['Occupied stations', snapshot.counts.Occupied, 'Confirmed sessions in progress', 'occupied', 'console'],
    ['Reserved stations', snapshot.counts.Reserved, 'Pending holds or upcoming today', 'reserved', 'clock'],
    ['Under maintenance', snapshot.counts.Maintenance, 'Temporarily out of service', 'maintenance', 'settings'],
    ["Today's bookings", snapshot.todayBookings, 'Includes recurring demo fixtures', 'neutral', 'bookings'],
    ['Unpaid / partial', commerce.unpaid.length, 'Saved bookings with outstanding balances', 'reserved', 'payments'],
    ["Today's collected", money(commerce.collectedToday), 'Successful saved receipts; fixtures excluded', 'available', 'revenue'],
  ]
  return <>
    {snapshot.counts.Inactive > 0 && <p className="ops-confirmation-note">{snapshot.counts.Inactive} station(s) are inactive or in an unavailable zone. These are counted separately from maintenance.</p>}
    <section className="ops-stat-grid" aria-label="Operational summary">{stats.map(([label, value, hint, tone, icon]) => <article key={label} className={`ops-stat ops-stat-${tone}`}>
      <div className="ops-stat-top"><span>{label}</span><span className="ops-stat-icon"><AdminIcon name={icon} size={19} /></span></div><strong>{value}</strong><p>{hint}</p>
    </article>)}</section>

    <section className="ops-floor-callout" aria-labelledby="floor-pulse-title">
      <div className="ops-floor-callout-heading"><div className="ops-floor-callout-title"><span className="ops-callout-icon"><AdminIcon name="floor" size={25} /></span><div><h2 id="floor-pulse-title">Your lounge, at a glance.</h2><p>Station status across every zone.</p></div></div><Link className="button button-primary" to="/admin/floor">Open lounge floor <AdminIcon name="arrow" size={18} /></Link></div>
      <div className="ops-zone-pulse">{floorZones.map((zone) => {
        const views = snapshot.stationViews.filter((view) => view.station.zoneId === zone.id)
        return <div key={zone.id}><div className="ops-zone-pulse-heading"><span>{zone.name}</span><strong>{views.filter((view) => view.status === 'Available').length}<small> / {views.length} available</small></strong></div><div className="ops-zone-pulse-stations" aria-label={`${zone.name} station status`}>{views.map((view) => <span key={view.station.id} className={`ops-pulse-${view.status.toLowerCase()}`} title={`${view.station.id.toUpperCase()}: ${view.status}`}><span className="sr-only">{view.station.id.toUpperCase()}: {view.status}</span></span>)}</div></div>
      })}</div>
    </section>

    <CommerceSummary data={data} />
    <div className="ops-dashboard-grid">
      <DashboardPanel title="Recent bookings" icon="bookings" subtitle="The latest activity in your lounge" count={snapshot.recent.length} action={<Link className="ops-text-link" to="/admin/bookings">Manage bookings <AdminIcon name="arrow" size={15} /></Link>}><BookingRows bookings={snapshot.recent} /></DashboardPanel>
      <div className="ops-dashboard-stack">
        <DashboardPanel title="Upcoming sessions" icon="clock" count={snapshot.upcoming.length}><BookingRows bookings={snapshot.upcoming} upcoming /></DashboardPanel>
        <DashboardPanel title="Pending food orders" icon="food" count={snapshot.foodOrders.length}>{snapshot.foodOrders.length ? <ul className="ops-order-list" tabIndex={snapshot.foodOrders.length > 2 ? 0 : undefined} aria-label="Pending food orders">{snapshot.foodOrders.map((booking) => <li key={booking.id}><span className="ops-order-symbol" aria-hidden="true"><AdminIcon name="food" size={20} /></span><div><Link className="ops-record-link" to={`/admin/bookings/${booking.id}`}>{booking.stationId.toUpperCase()} / {foodQuantity(booking)} items</Link><small>{booking.addOns.map((item) => `${item.quantity} x ${item.name}`).join(', ')}</small></div><StatusBadge status={foodStatus(booking)} /></li>)}</ul> : <EmptyState icon="food" title="All caught up">No food orders are waiting with a known fulfillment status.</EmptyState>}</DashboardPanel>
        <DashboardPanel title="Stations requiring attention" icon="warning" count={snapshot.attention.length}>{snapshot.attention.length ? <ul className="ops-order-list" tabIndex={snapshot.attention.length > 2 ? 0 : undefined} aria-label="Stations requiring attention">{snapshot.attention.map((view) => <li key={view.station.id}><span className="ops-attention-symbol" aria-hidden="true"><AdminIcon name="settings" size={20} /></span><div><Link className="ops-record-link" to="/admin/floor">{view.station.id.toUpperCase()}</Link><small>{view.maintenance?.reason ?? (view.status === 'Inactive' ? 'Station or zone unavailable for bookings' : 'Active session has an outstanding mock balance')}</small></div><StatusBadge status={view.status} /></li>)}</ul> : <EmptyState title="Everything looks good">No stations currently require attention.</EmptyState>}</DashboardPanel>
      </div>
    </div>
  </>
}
