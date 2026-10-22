import { BOOKING_WINDOW_DAYS, CLOSE_HOUR, DURATIONS, OPEN_HOUR } from '../../data/bookingCatalog'
import { sessionProblem, localDate } from '../../lib/bookingRules'

export default function SessionPicker({ input, onChange, now, storageError }) {
  const slots = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, index) => OPEN_HOUR + index)
  return <section className="customer-panel" aria-labelledby="session-title"><h2 id="session-title">02 / Make time for play</h2><p className="field-hint" id="demo-hours">Demo hours: 10:00–22:00 IST (Asia/Kolkata). Book up to 30 days ahead. Demo confirmed reservations run 12:00 to 13:00 daily. Stations ending in 02 also have pending reservations 14:00 to 15:00. These are not business policies.</p>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="form-field"><label htmlFor="booking-date">Booking date</label><input id="booking-date" type="date" required min={localDate(now)} max={localDate(now, BOOKING_WINDOW_DAYS)} value={input.date} onChange={(event) => onChange({ date: event.target.value })} aria-describedby="demo-hours" /></div>
      <div className="form-field"><label htmlFor="booking-duration">Duration</label><select id="booking-duration" value={input.duration} onChange={(event) => onChange({ duration: Number(event.target.value) })}>{DURATIONS.map((hours) => <option key={hours} value={hours}>{hours} {hours === 1 ? 'hour' : 'hours'}</option>)}</select></div>
    </div>
    <fieldset className="slot-fieldset"><legend>Start time · IST</legend><div className="slot-grid">{slots.map((hour) => {
      const periodProblem = sessionProblem({ ...input, hour }, now)
      const disabled = Boolean(periodProblem || storageError)
      return <label key={hour} className={`time-slot ${disabled ? 'slot-unavailable' : ''}`}><input type="radio" name="time-slot" checked={input.hour === hour} value={hour} disabled={disabled} required onChange={() => onChange({ hour })} /><span><strong>{String(hour).padStart(2, '0')}:00</strong><small>{storageError ? 'Storage unavailable' : periodProblem || 'Select time'}</small></span></label>
    })}</div></fieldset>
  </section>
}
