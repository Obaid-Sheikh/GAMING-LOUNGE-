import { games, zones } from '../../data/catalog'
import { money, stations } from '../../data/bookingCatalog'
import { formatDate, formatTime, startOfSlot } from '../../lib/bookingRules'

export default function BookingSummary({ booking }) {
  const station = stations.find((item) => item.id === booking.stationId)
  const zone = zones.find((item) => item.id === booking.zoneId)
  const validTime = Number.isFinite(booking.start) && Number.isFinite(booking.end)
  const selectedDate = validTime ? booking.start : startOfSlot(booking.date ?? '', 0)
  return <dl className="booking-details">
    {booking.id && <div><dt>Demo reference</dt><dd className="booking-reference">{booking.id}</dd></div>}
    <div><dt>Zone</dt><dd>{zone?.name ?? 'Choose a zone'}</dd></div>
    <div><dt>Station</dt><dd>{station?.name ?? 'Choose a station'}</dd></div>
    {station?.amenities && <div><dt>Room capacity</dt><dd>Up to {station.capacity} guests · Exclusive use</dd></div>}
    <div><dt>Date · IST</dt><dd>{Number.isFinite(selectedDate) ? formatDate(selectedDate) : 'Choose a date'}</dd></div>
    <div><dt>Session · IST</dt><dd>{validTime ? `${formatTime(booking.start)}–${formatTime(booking.end)}` : 'Choose a start time'}</dd></div>
    <div><dt>Duration</dt><dd>{booking.duration} {booking.duration === 1 ? 'hour' : 'hours'}</dd></div>
    {booking.gameId && <div><dt>Game</dt><dd>{games.find((game) => game.id === booking.gameId)?.name}</dd></div>}
    <div><dt>Gaming session</dt><dd>{money(booking.gamingPrice ?? booking.price)}</dd></div>
    {(booking.addOns ?? []).map((item) => <div key={item.id}><dt>{item.quantity} &times; {item.name}</dt><dd>{money(item.quantity * item.unitPrice)}</dd></div>)}
    <div><dt>Food subtotal</dt><dd>{money(booking.foodSubtotal ?? 0)}</dd></div>
    <div className="summary-total"><dt>Total demo amount</dt><dd>{money(booking.price)}<small>No payment collected</small></dd></div>
  </dl>
}
