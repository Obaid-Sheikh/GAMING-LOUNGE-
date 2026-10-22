import useNow from '../../hooks/useNow'
import { useState } from 'react'
import { Link } from 'react-router'
import { runAdmin, unresolved } from '../../lib/adminManagement'
import Button from '../Button'
import ManagementDialog from './ManagementDialog'
export default function StationActionDialog({ type, station, data, onClose }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const now = useNow()
  const conflicts = unresolved(data, station.id, now)
  const title = ({ 'maintenance.start': 'Mark maintenance', 'maintenance.end': 'Restore from maintenance', 'station.archive': 'Archive station', 'station.restore': 'Restore station' })[type]
  const protectedChange = ['maintenance.start', 'station.archive'].includes(type)
  async function confirm(event) {
    event.preventDefault(); setPending(true); setError('')
    try { await runAdmin({ type, id: station.id, values: { reason } }); onClose() } catch (error) { setError(error.message) } finally { setPending(false) }
  }
  return <ManagementDialog title={title} onClose={onClose}><form className="ops-form" onSubmit={confirm}><p>Confirm {title.toLowerCase()} for <strong>{station.id.toUpperCase()}</strong>?</p>{protectedChange && conflicts.length > 0 && <div className="form-error"><p>{conflicts.length} saved reservation(s) need resolution first. This operation is blocked; nothing will be cancelled automatically.</p><ul>{conflicts.map((booking) => <li key={booking.id}><Link to={`/admin/bookings/${booking.id}`}>{booking.id}</Link></li>)}</ul><Link className="ops-text-link" to={`/admin/bookings?station=${station.id}`}>Resolve reservations in Bookings</Link></div>}{type === 'maintenance.start' && <label>Maintenance reason<textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>}{error && <p className="form-error" role="alert">{error}</p>}<div className="ops-form-actions"><Button type="submit" disabled={pending || protectedChange && conflicts.length > 0}>{pending ? 'Saving...' : 'Confirm change'}</Button><Button variant="secondary" onClick={onClose}>Cancel</Button></div></form></ManagementDialog>
}
