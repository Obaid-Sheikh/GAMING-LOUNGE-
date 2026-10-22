import { useState } from 'react'
import useLoungeData from '../../hooks/useLoungeData'
import useNow from '../../hooks/useNow'
import { bookingCandidate, extensionQuote, formatTime, localDate } from '../../lib/bookingRules'
import { runAdmin } from '../../lib/adminManagement'
import { money } from '../../data/bookingCatalog'
import Button from '../Button'
import BookingSummary from '../booking/BookingSummary'
import ManagementDialog from './ManagementDialog'
import ReservationFields from './ReservationFields'

function BookingActionForm({ type, booking, data, onClose, onSuccess }) {
  const [input, setInput] = useState(() => ({ zoneId: booking.zoneId, stationId: booking.stationId, date: localDate(booking.start), hour: Number(formatTime(booking.start).slice(0, 2)), duration: booking.duration, reason: '', endHour: Math.min(22, Number(formatTime(booking.end).slice(0, 2)) + 1) }))
  const [baseRevision] = useState(data.revision)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const title = ({ 'session.start': 'Start session', 'session.end': 'End session', 'session.extend': 'Extend session', 'booking.cancel': 'Cancel reservation', 'booking.reschedule': 'Reschedule reservation' })[type]
  function change(patch) { setInput((previous) => ({ ...previous, ...patch })); setError('') }
  async function submit(event) {
    event.preventDefault(); setPending(true); setError('')
    try { await runAdmin({ type, id: booking.id, values: input, expectedRevision: baseRevision }); onSuccess(`${title} saved.`); onClose() } catch (error) { setError(error.message) } finally { setPending(false) }
  }
  let candidate
  if (type === 'booking.reschedule') {
    candidate = bookingCandidate({ ...input, addOns: booking.addOns }, data.inventory)
    if (input.stationId === booking.stationId) {
      candidate.hourlyRate = booking.hourlyRate ?? booking.gamingPrice / booking.duration
      candidate.gamingPrice = Math.round(candidate.hourlyRate * input.duration * 100) / 100
      candidate.price = candidate.gamingPrice + booking.foodSubtotal
    }
  }
  return <ManagementDialog title={title} onClose={onClose}><form className="ops-form" onSubmit={submit}><p>Booking <strong className="ops-wrap">{booking.id}</strong> / {booking.stationId.toUpperCase()}</p>
    {type === 'booking.reschedule' && <><ReservationFields input={input} onChange={change} inventory={data.inventory} bookings={data.bookings.filter((item) => item.id !== booking.id)} allowGame={false} /><p className="ops-muted">Ownership, payment status, and food prices are preserved. The original hourly rate applies on the same station; another station uses its current rate. Select a station compatible with the original game.</p><BookingSummary booking={candidate} /></>}
    {type === 'booking.cancel' && <label>Cancellation reason<textarea required maxLength={500} value={input.reason} onChange={(event) => change({ reason: event.target.value })} /></label>}
    {type === 'session.extend' && <><label>New end time (IST)<select value={input.endHour} onChange={(event) => change({ endHour: Number(event.target.value) })}>{Array.from({ length: 13 }, (_, i) => i + 10).filter((hour) => hour > Number(formatTime(booking.end).slice(0, 2))).map((hour) => <option key={hour} value={hour}>{hour}:00</option>)}</select></label><p className="ops-confirmation-note">Total: {money(booking.price)} to {money(extensionQuote(booking, input.endHour).price)}. Original hourly rate and food snapshots are retained. Closing time: 22:00 IST.</p></>}
    {type === 'session.start' && <p className="ops-confirmation-note">Confirm the customer is present. The actual start time is recorded now; scheduled times remain unchanged.</p>}
    {type === 'session.end' && <p className="ops-confirmation-note">Confirm this session has finished. Actual end time is recorded and occupancy released. The scheduled interval stays reserved until its original end; charges are unchanged.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="ops-form-actions"><Button type="submit" disabled={pending}>{pending ? 'Saving...' : `Confirm ${title.toLowerCase()}`}</Button><Button variant="secondary" disabled={pending} onClick={onClose}>Back</Button></div>
  </form></ManagementDialog>
}
export default function BookingActions({ booking }) {
  const data = useLoungeData()
  const now = useNow()
  const [action, setAction] = useState(null)
  const [message, setMessage] = useState('')
  if (booking.fixture) return <p className="ops-confirmation-note">Recurring demo fixture / read-only. Create a walk-in or select a saved customer reservation to manage a session.</p>
  const confirmed = booking.status === 'confirmed'
  const unstarted = ['confirmed', 'pending'].includes(booking.status) && booking.actualStart === undefined && booking.end > now
  return <section className="ops-detail-section"><h3>Booking and session controls</h3><p className="ops-muted">Actions always use current IST time, even when the dashboard is previewing a demo snapshot.</p><div className="ops-form-actions">
    <Button variant="secondary" disabled={!confirmed || booking.actualStart !== undefined || now < booking.start || now >= booking.end} onClick={() => setAction('session.start')}>Start session</Button>
    <Button variant="secondary" disabled={!confirmed || booking.actualStart === undefined || booking.actualEnd !== undefined} onClick={() => setAction('session.end')}>End session</Button>
    <Button variant="secondary" disabled={!confirmed || booking.actualEnd !== undefined || booking.end <= now && booking.actualStart === undefined || formatTime(booking.end) === '22:00'} onClick={() => setAction('session.extend')}>Extend session</Button>
    <Button variant="secondary" disabled={!unstarted} onClick={() => setAction('booking.reschedule')}>Reschedule</Button><Button variant="secondary" disabled={!unstarted} onClick={() => setAction('booking.cancel')}>Cancel reservation</Button>
  </div>{message && <p role="status" className="ops-confirmation-note">{message}</p>}{action && <BookingActionForm type={action} booking={booking} data={data} onClose={() => setAction(null)} onSuccess={setMessage} />}</section>
}
