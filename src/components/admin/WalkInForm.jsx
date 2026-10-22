import { useState } from 'react'
import { useNavigate } from 'react-router'
import { bookingCandidate, formatTime, localDate } from '../../lib/bookingRules'
import { orderedZones } from '../../lib/inventory'
import { readRepository } from '../../lib/mockRepository'
import { runAdmin } from '../../lib/adminManagement'
import Button from '../Button'
import BookingSummary from '../booking/BookingSummary'
import FoodModal from '../booking/FoodModal'
import ManagementDialog from './ManagementDialog'
import ReservationFields from './ReservationFields'
export default function WalkInForm({ inventory, bookings, stationId, onClose }) {
  const navigate = useNavigate()
  const [input, setInput] = useState(() => ({ customerName: '', customerContact: '', zoneId: inventory.stations.find((item) => item.id === stationId)?.zoneId ?? orderedZones(inventory).find((zone) => zone.active && !zone.archived)?.id ?? '', stationId: stationId ?? '', date: localDate(), hour: Math.max(10, Math.min(21, Number(formatTime(Date.now()).slice(0, 2)))), duration: 1, addOns: [], gameId: '' }))
  const [food, setFood] = useState(false)
  const [review, setReview] = useState(false)
  const [reviewRevision, setReviewRevision] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  function change(patch) { setInput((previous) => ({ ...previous, ...patch })); setReview(false) }
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!review) { setReviewRevision(readRepository().revision); setReview(true); return }
    setPending(true)
    try { const booking = await runAdmin({ type: 'walk-in.create', values: input, expectedRevision: reviewRevision }); onClose(); navigate(`/admin/bookings/${booking.id}`) } catch (error) { setError(error.message); setReview(false) } finally { setPending(false) }
  }
  return <ManagementDialog title="Create walk-in booking" onClose={onClose}><form className="ops-form" onSubmit={submit}><div className="ops-form-grid"><label>Customer display name<input required maxLength={100} value={input.customerName} onChange={(event) => change({ customerName: event.target.value })} /></label><label>Contact information (optional, admin only)<input maxLength={150} value={input.customerContact} onChange={(event) => change({ customerContact: event.target.value })} /></label></div><ReservationFields input={input} onChange={change} inventory={inventory} bookings={bookings} walkIn />
    <Button variant="secondary" onClick={() => setFood(true)}>Food and beverage add-ons</Button><BookingSummary booking={bookingCandidate(input, inventory)} />{review && <p className="ops-confirmation-note" role="status">Review this walk-in reservation. It is confirmed only after you save; the session must then be started explicitly.</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="ops-form-actions"><Button type="submit" disabled={pending}>{pending ? 'Saving...' : review ? 'Confirm walk-in booking' : 'Review walk-in booking'}</Button><Button variant="secondary" onClick={onClose}>Cancel</Button></div>
    {food && <FoodModal addOns={input.addOns} onCancel={(addOns) => { change({ addOns }); setFood(false) }} onComplete={(addOns) => { change({ addOns }); setFood(false) }} />}
  </form></ManagementDialog>
}
