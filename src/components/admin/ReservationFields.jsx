import { DURATIONS, OPEN_HOUR, CLOSE_HOUR, BOOKING_WINDOW_DAYS } from '../../data/bookingCatalog'
import { games } from '../../data/catalog'
import { availability, localDate } from '../../lib/bookingRules'
import { orderedZones } from '../../lib/inventory'
import useNow from '../../hooks/useNow'
export default function ReservationFields({ input, onChange, inventory, bookings, walkIn = false, allowGame = true }) {
  const now = useNow()
  const station = inventory.stations.find((item) => item.id === input.stationId)
  const durations = [...new Set([...DURATIONS, input.duration])].sort((a, b) => a - b)
  return <><p className="ops-muted">Demo hours: 10:00-22:00 IST. {walkIn ? 'Walk-ins may reserve the current hourly slot if it has not ended; the full hourly charge applies.' : 'Choose a future slot. Availability is checked again before saving.'}</p>
    <div className="ops-form-grid"><label>Gaming zone<select value={input.zoneId} onChange={(event) => onChange({ zoneId: event.target.value, stationId: '', gameId: '' })}>{orderedZones(inventory).filter((zone) => !zone.archived && zone.active).map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label>Booking date<input type="date" required min={localDate(now)} max={localDate(now, BOOKING_WINDOW_DAYS)} value={input.date} onChange={(event) => onChange({ date: event.target.value })} /></label>
      <label>Start time (IST)<select value={input.hour} onChange={(event) => onChange({ hour: Number(event.target.value) })}>{Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label><label>Duration<select value={input.duration} onChange={(event) => onChange({ duration: Number(event.target.value) })}>{durations.map((hours) => <option key={hours} value={hours}>{hours} hour(s)</option>)}</select></label>
      <label>Station<select required value={input.stationId} onChange={(event) => onChange({ stationId: event.target.value, gameId: '' })}><option value="">Choose a station</option>{inventory.stations.filter((item) => item.zoneId === input.zoneId && !item.archived).map((item) => { const reason = availability({ ...input, stationId: item.id }, bookings, now, inventory, { allowStartedSlot: walkIn, allowExtended: !walkIn }); return <option key={item.id} value={item.id} disabled={Boolean(reason)}>{item.id.toUpperCase()} / {item.name} / {reason || 'Available'}</option> })}</select></label>
      {allowGame && station?.games.length > 0 && <label>Game (optional)<select value={input.gameId ?? ''} onChange={(event) => onChange({ gameId: event.target.value })}><option value="">Decide at the lounge</option>{station.games.map((id) => <option key={id} value={id}>{games.find((game) => game.id === id)?.name}</option>)}</select></label>}
    </div></>
}
