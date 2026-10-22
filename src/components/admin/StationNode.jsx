import { useState } from 'react'
import { zones } from '../../data/catalog'
import { foodQuantity, paymentStatus, remainingMinutes } from '../../lib/adminSelectors'
import { formatDate, formatTime } from '../../lib/bookingRules'
import AdminIcon from './AdminIcon'
import StatusBadge from './StatusBadge'

export default function StationNode({ view, now, onSelect, position, selected }) {
  const { station, status, booking, active, maintenance } = view
  const [previewSuppressed, setPreviewSuppressed] = useState(false)
  const tooltipId = `preview-${station.id}`
  return <div className="ops-station-wrap" onMouseEnter={() => setPreviewSuppressed(false)} onFocus={() => setPreviewSuppressed(false)} onKeyDown={(event) => { if (event.key === 'Escape') setPreviewSuppressed(true) }} style={position ? { gridRow: position[0], gridColumn: position[1] } : undefined}>
    <button className={`ops-station ops-station-${status.toLowerCase()}`} aria-label={`${station.id.toUpperCase()}, ${status}. Open station details`} aria-describedby={tooltipId} aria-haspopup="dialog" aria-expanded={selected} onClick={() => onSelect(station.id)}>
      <span className="ops-station-equipment"><AdminIcon name={station.zoneId === 'pc' ? 'pc' : station.zoneId === 'entertainment' ? 'entertainment' : 'console'} size={30} /><span aria-hidden="true" className="ops-station-light" /></span><strong>{station.id.toUpperCase()}</strong><StatusBadge status={status} />
    </button>
    <div id={tooltipId} role="tooltip" style={previewSuppressed ? { display: 'none' } : undefined} className="ops-station-tooltip"><strong>{station.id.toUpperCase()} / {zones.find((zone) => zone.id === station.zoneId)?.name}</strong><span>Operating status: {status}</span>{booking ? <><span>{formatDate(booking.start)} / {formatTime(booking.start)} to {formatTime(booking.end)} IST</span><span>Payment: {paymentStatus(booking)}</span><span>{foodQuantity(booking)} food / drink items</span></> : <span>No active or upcoming reservation</span>}{active && <span>{remainingMinutes(active, now)} minutes remaining</span>}{maintenance && <span>Maintenance: {maintenance.reason}</span>}</div>
  </div>
}
