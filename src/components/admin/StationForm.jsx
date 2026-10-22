import { useState } from 'react'
import { games } from '../../data/catalog'
import { currentMaintenance, defaultEquipment, orderedZones, supportedGames } from '../../lib/inventory'
import { runAdmin } from '../../lib/adminManagement'
import Button from '../Button'
import ManagementDialog from './ManagementDialog'

export default function StationForm({ station, inventory, revision, onClose }) {
  const existingMaintenance = station && currentMaintenance(inventory, station.id)
  const [input, setInput] = useState(() => station ? structuredClone(station) : { id: '', name: '', zoneId: 'playstation', equipment: defaultEquipment('playstation'), rate: 200, capacity: 1, games: [], amenities: [], active: true, archived: false })
  const [availability, setAvailability] = useState(existingMaintenance ? 'maintenance' : station?.active === false ? 'inactive' : 'active')
  const [notes, setNotes] = useState(existingMaintenance?.reason ?? '')
  const [baseRevision] = useState(revision)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  function change(patch) { setInput((previous) => ({ ...previous, ...patch })); setError('') }
  async function submit(event) {
    event.preventDefault(); setPending(true); setError('')
    try { await runAdmin({ type: 'station.save', id: station?.id, values: { ...input, active: availability !== 'inactive' }, expectedRevision: baseRevision, maintenanceRequested: availability === 'maintenance', maintenanceReason: notes }); onClose() }
    catch (error) { setError(error.message) } finally { setPending(false) }
  }
  return <ManagementDialog title={station ? 'Edit station' : 'Add station'} onClose={onClose}><form className="ops-form" onSubmit={submit}>
    <p className="ops-muted">Station IDs stay permanent. Resolve saved reservations before changing a station's zone or making it unavailable.</p>
    <div className="ops-form-grid"><label>Station ID<input required readOnly={Boolean(station)} maxLength={40} pattern="[a-z0-9][a-z0-9-]{1,39}" value={input.id} onChange={(event) => change({ id: event.target.value.toLowerCase() })} /></label><label>Station name<input required maxLength={100} value={input.name} onChange={(event) => change({ name: event.target.value })} /></label>
      <label>Gaming zone<select value={input.zoneId} onChange={(event) => change({ zoneId: event.target.value, equipment: defaultEquipment(event.target.value), games: input.games.filter((id) => supportedGames[event.target.value].includes(id)), amenities: [], position: undefined })}>{orderedZones(inventory).filter((zone) => !zone.archived || zone.id === input.zoneId).map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <label>Equipment type<input required maxLength={100} value={input.equipment} onChange={(event) => change({ equipment: event.target.value })} /></label>
      <label>Hourly price (INR)<input type="number" min="0" max="1000000" step="0.01" required value={input.rate} onChange={(event) => change({ rate: Number(event.target.value) })} /></label><label>Player capacity<input type="number" min="1" max="50" required value={input.capacity} onChange={(event) => change({ capacity: Number(event.target.value) })} /></label>
      <label>Operational availability<select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option></select></label>
      {availability === 'maintenance' && <label>Maintenance notes<textarea required maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} readOnly={Boolean(existingMaintenance)} /></label>}
    </div>
    {input.zoneId !== 'entertainment' && <fieldset><legend>Supported games</legend><div className="ops-checkboxes">{games.filter((game) => supportedGames[input.zoneId].includes(game.id)).map((game) => <label key={game.id}><input type="checkbox" checked={input.games.includes(game.id)} onChange={(event) => change({ games: event.target.checked ? [...input.games, game.id] : input.games.filter((id) => id !== game.id) })} />{game.name}</label>)}</div></fieldset>}
    {input.zoneId === 'entertainment' && <label>Entertainment amenities (one per line)<textarea maxLength={1500} value={input.amenities.join('\n')} onChange={(event) => change({ amenities: event.target.value.split('\n').filter((line) => line.trim()) })} /></label>}
    {station && <fieldset><legend>Floor position (leave the zone unchanged to move this station)</legend><div className="ops-form-grid"><label>Row<input type="number" min="1" max="100" value={input.position?.[0] ?? ''} onChange={(event) => change({ position: [Number(event.target.value), input.position?.[1] ?? 1] })} /></label><label>Column<input type="number" min="1" max={inventory.zones.find((zone) => zone.id === input.zoneId)?.columns ?? 3} value={input.position?.[1] ?? ''} onChange={(event) => change({ position: [input.position?.[0] ?? 1, Number(event.target.value)] })} /></label></div></fieldset>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="ops-form-actions"><Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save station'}</Button><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button></div>
  </form></ManagementDialog>
}
