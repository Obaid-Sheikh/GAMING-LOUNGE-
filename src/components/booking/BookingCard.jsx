import useLoungeData from '../../hooks/useLoungeData'
import { useState } from 'react'
import { bookingStatus, formatDate, formatTime } from '../../lib/bookingRules'
import { cancelDemo } from '../../lib/bookingStore'
import { useAuth } from '../../context/authContext'
import Button from '../Button'
import BookingSummary from './BookingSummary'

export default function BookingCard({ booking, now }) {
  const { inventory: { stations } } = useLoungeData()
  const { user } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const station = stations.find((item) => item.id === booking.stationId)
  const status = bookingStatus(booking, now)
  const canCancel = status === 'Upcoming'

  async function cancel() {
    if (pending) return
    setPending(true)
    setError('')
    try { await cancelDemo(booking.id, user.id); setConfirming(false) }
    catch (error) { setError(error.message) }
    finally { setPending(false) }
  }

  return <article className="customer-panel booking-card"><div className="booking-card-heading"><div><p className="eyebrow">{formatDate(booking.start)} · {formatTime(booking.start)}–{formatTime(booking.end)} IST</p><h3>{station.name}</h3></div><span className="booking-badge">{status}</span></div>
    <details><summary>Booking details</summary><BookingSummary booking={booking} /></details>
    <div className="flex flex-wrap items-center gap-3"><Button to={`/booking/confirmation/${booking.id}`} variant="secondary">View reservation</Button>{canCancel && !confirming && <Button variant="secondary" onClick={() => setConfirming(true)}>Cancel demo booking</Button>}</div>
    {canCancel && confirming && <div className="cancel-prompt"><p>Cancel this demo session? Its time slot will become available again. No charges or refunds apply.</p><div className="flex flex-wrap gap-3"><Button disabled={pending} onClick={cancel}>{pending ? 'Cancelling…' : 'Confirm cancellation'}</Button><Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>Keep reservation</Button></div></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </article>
}
