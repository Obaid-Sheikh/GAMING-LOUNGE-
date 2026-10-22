import useLoungeData from '../../hooks/useLoungeData'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { games } from '../../data/catalog'
import { money } from '../../data/bookingCatalog'
import { equipmentName, remainingMinutes } from '../../lib/adminSelectors'
import { formatDate, formatTime } from '../../lib/bookingRules'
import AdminIcon from './AdminIcon'
import BookingActions from './BookingActions'
import StationActionDialog from './StationActionDialog'
import WalkInForm from './WalkInForm'
import Button from '../Button'
import BookingInfo from './BookingInfo'
import StatusBadge from './StatusBadge'

export default function StationDrawer({ view, now, onClose }) {
  const data = useLoungeData()
  const { inventory } = data
  const { zones } = inventory
  const [maintenanceAction, setMaintenanceAction] = useState(null)
  const [walkIn, setWalkIn] = useState(false)
  const dialog = useRef(null)
  const { station, status, maintenance, active, upcoming, booking } = view
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current
    element.showModal()
    return () => { element.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return <dialog className="admin-drawer" ref={dialog} aria-labelledby="station-drawer-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="ops-drawer-header"><div><p className="ops-eyebrow">STATION DETAILS</p><h2 id="station-drawer-title">{station.id.toUpperCase()}</h2></div><button className="ops-icon-button" aria-label="Close station details" onClick={onClose}><AdminIcon name="close" /></button></header>
    <div className="ops-drawer-content"><div className="ops-drawer-station-hero"><span className="ops-drawer-device"><AdminIcon name={station.zoneId === 'pc' ? 'pc' : station.zoneId === 'entertainment' ? 'entertainment' : 'console'} size={34} /></span><div><strong>{station.name}</strong><p>{equipmentName(station)}</p></div><StatusBadge status={status} /></div>
      <section className="ops-detail-section"><h3>Station information</h3><dl className="ops-detail-list"><div><dt>Zone</dt><dd>{zones.find((zone) => zone.id === station.zoneId)?.name}</dd></div><div><dt>Equipment</dt><dd>{equipmentName(station)}</dd></div><div><dt>Hourly demo rate</dt><dd>{money(station.rate)}</dd></div><div><dt>Capacity</dt><dd>{station.capacity} {station.capacity === 1 ? 'player' : 'guests / exclusive room'}</dd></div><div><dt>Maintenance</dt><dd>{maintenance?.reason ?? (!station.active ? 'Station inactive' : 'None reported')}</dd></div></dl><h4>{station.zoneId === 'entertainment' ? 'Amenities' : 'Supported games'}</h4><ul className="ops-tags">{(station.zoneId === 'entertainment' ? station.amenities : station.games.map((id) => games.find((game) => game.id === id)?.name)).map((name) => <li key={name}>{name}</li>)}</ul></section>
      {active && <section className="ops-detail-section ops-session"><h3>Session in progress</h3><strong>{remainingMinutes(active, now)} min remaining</strong><p>{formatTime(active.start)} to {formatTime(active.end)} IST</p></section>}
      {upcoming && <section className="ops-detail-section"><h3>Next reservation</h3><p className="ops-muted">{formatDate(upcoming.start)} / {formatTime(upcoming.start)} to {formatTime(upcoming.end)} IST</p><Link className="ops-text-link" to={`/admin/bookings/${upcoming.id}`}>View upcoming reservation <span aria-hidden="true">&rarr;</span></Link></section>}
      {booking ? <><BookingInfo booking={booking} /><BookingActions booking={booking} /><Link className="button button-primary" to={`/admin/bookings/${booking.id}`}>View booking</Link></> : <section className="ops-detail-section"><h3>No active or upcoming reservation</h3><p className="ops-muted">No matching customer or session is assigned to this station.</p></section>}
      <section className="ops-detail-section"><h3>Station management</h3><div className="ops-form-actions"><Link className="button button-secondary" to={`/admin/stations?edit=${station.id}`}>Edit station</Link><Button variant="secondary" onClick={() => setMaintenanceAction(maintenance ? 'maintenance.end' : 'maintenance.start')}>{maintenance ? 'Restore operation' : 'Mark maintenance'}</Button><Button variant="secondary" onClick={() => setWalkIn(true)}>Create walk-in booking</Button></div><p className="ops-muted">Resolve saved reservations in Bookings before making a station unavailable.</p></section>
      {maintenanceAction && <StationActionDialog type={maintenanceAction} station={station} data={data} onClose={() => setMaintenanceAction(null)} />}
      {walkIn && <WalkInForm inventory={inventory} bookings={data.bookings} stationId={station.id} onClose={() => setWalkIn(false)} />}
    </div>
  </dialog>
}
