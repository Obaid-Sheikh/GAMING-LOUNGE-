import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Button from '../components/Button'
import CustomerPage from '../components/CustomerPage'
import StationPicker from '../components/booking/StationPicker'
import SessionPicker from '../components/booking/SessionPicker'
import FoodModal from '../components/booking/FoodModal'
import BookingSummary from '../components/booking/BookingSummary'
import { useAuth } from '../context/authContext'
import { zones } from '../data/catalog'
import { availability, bookingCandidate, localDate } from '../lib/bookingRules'
import { reserveDemo } from '../lib/bookingStore'
import useBookings from '../hooks/useBookings'
import useNow from '../hooks/useNow'

function BookingForm({ zoneId, onZoneChange, unknownZone }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { bookings, error: storageError } = useBookings()
  const now = useNow()
  const [input, setInput] = useState(() => ({ stationId: '', date: localDate(Date.now(), 1), duration: 1, hour: null, addOns: [], gameId: '' }))
  const [foodOpen, setFoodOpen] = useState(false)
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [previousZone, setPreviousZone] = useState(zoneId)
  const submitting = useRef(false)
  const reviewHeading = useRef(null)
  const candidate = bookingCandidate(input)
  const problem = availability(input, bookings, now)

  // Reset dependent selections when URL navigation changes the zone, while keeping
  // the radio group mounted so keyboard focus survives a zone change.
  if (previousZone !== zoneId) {
    setPreviousZone(zoneId)
    setInput((previous) => ({ ...previous, stationId: '', gameId: '', hour: null }))
    setReview(false)
    setFoodOpen(false)
    setError('')
  }

  // A time tick or another tab can invalidate the selected station too.
  if (input.stationId && problem) {
    setInput((previous) => ({ ...previous, stationId: '', gameId: '' }))
    setError('Your selected station is unavailable. Choose an available station before continuing.')
  }

  useEffect(() => {
    if (review) reviewHeading.current?.focus()
  }, [review])

  function change(patch) {
    const next = { ...input, ...patch }
    if (next.stationId && availability(next, bookings, now)) {
      next.stationId = ''
      next.gameId = ''
      setError('Your selected station is unavailable for this period. Select an available station.')
    } else setError('')
    setInput(next)
  }

  function openReview(event) {
    event.preventDefault()
    if (problem || storageError) return setError(storageError || problem)
    setError('')
    setFoodOpen(true)
  }

  async function confirm() {
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setError('')
    try {
      const booking = await reserveDemo(input, user.id)
      navigate(`/booking/confirmation/${booking.id}`, { replace: true })
    } catch (error) {
      setError(error.message)
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return <CustomerPage eyebrow={review ? 'YOUR SESSION / REVIEW' : 'YOUR SESSION / BUILD IT YOUR WAY'} title={review ? 'One last look.' : 'Find your next session.'}>
    {storageError && <p className="form-error" role="alert">{storageError}</p>}
    {unknownZone && <p className="form-error" role="alert">That zone was not found. Choose one of the demo zones below.</p>}
    {review ? <div className="review-layout customer-panel"><div><p className="eyebrow">06 / REVIEW YOUR DEMO BOOKING</p><h2 ref={reviewHeading} tabIndex={-1}>Ready to lock it in?</h2><p className="muted-copy">Check the station and session below. This creates a local demo reservation only.</p><p className="field-hint">Demo cancellation: upcoming sessions can be cancelled in My bookings. No charges or refunds apply.</p><BookingSummary booking={candidate} /><Button variant="secondary" disabled={pending} onClick={() => setFoodOpen(true)}>Edit food and drinks</Button>{(error || problem) && <p role="alert" className="form-error">{error || `${problem}. Edit your selection before confirming.`}</p>}<div className="flex flex-wrap gap-3"><Button disabled={pending || Boolean(problem || storageError)} onClick={confirm}>{pending ? 'Saving demo booking…' : 'Confirm demo reservation'}</Button><Button variant="secondary" disabled={pending} onClick={() => { setReview(false); setError('') }}>Edit selection</Button></div></div></div> : <form onSubmit={openReview} className="booking-layout">
      <div className="booking-fields">
        <fieldset className="customer-panel"><legend>01 / Select your gaming zone</legend><div className="grid gap-3 sm:grid-cols-2">{zones.map((zone) => <label key={zone.id} className="choice-card"><input type="radio" name="zone" value={zone.id} checked={zoneId === zone.id} required onChange={() => onZoneChange(zone.id)} /><span><strong>{zone.id === 'entertainment' ? 'Private entertainment / Netflix & Chill' : zone.name}</strong><span>{zone.tag}</span></span></label>)}</div></fieldset>
        <SessionPicker input={input} onChange={change} now={now} storageError={storageError} />
        <StationPicker zoneId={zoneId} selected={input.stationId} input={input} bookings={bookings} now={now} storageError={storageError} onChange={(stationId, gameId = '') => change({ stationId, gameId })} />
      </div>
      <aside className="customer-panel session-summary" aria-labelledby="summary-title"><p className="eyebrow">YOUR NEXT SESSION</p><h2 id="summary-title">The game plan.</h2><BookingSummary booking={{ ...candidate, zoneId, date: input.date }} /><p className="field-hint">Demo estimates use the selected station’s hourly rate. No payment, taxes, or fees are collected.</p>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={Boolean(problem || storageError)}>Continue to food & review ↗</Button>{problem && <p className="field-hint" role="status">{input.hour === null && input.stationId ? 'Choose an available start time to continue.' : problem}</p>}</aside>
    </form>}
    {foodOpen && <FoodModal addOns={input.addOns} onCancel={(addOns) => { setInput((previous) => ({ ...previous, addOns })); setFoodOpen(false) }} onComplete={(addOns) => { setInput((previous) => ({ ...previous, addOns })); setFoodOpen(false); setReview(true) }} />}
  </CustomerPage>
}

export default function BookingPage() {
  const [params, setParams] = useSearchParams()
  const zone = params.get('zone') ?? ''
  const zoneId = zones.some((item) => item.id === zone) ? zone : ''
  function selectZone(id) {
    setParams((previous) => { const next = new URLSearchParams(previous); next.set('zone', id); return next }, { replace: true })
  }
  return <BookingForm zoneId={zoneId} unknownZone={Boolean(zone && !zoneId)} onZoneChange={selectZone} />
}
