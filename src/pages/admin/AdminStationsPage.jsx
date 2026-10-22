import { useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router'
import { money } from '../../data/bookingCatalog'
import { currentMaintenance, orderedZones } from '../../lib/inventory'
import { formatDate, formatTime } from '../../lib/bookingRules'
import Button from '../../components/Button'
import StationForm from '../../components/admin/StationForm'
import ZoneForm from '../../components/admin/ZoneForm'
import StationActionDialog from '../../components/admin/StationActionDialog'
import ActivityLog from '../../components/admin/ActivityLog'

export default function AdminStationsPage() {
  const data = useOutletContext()
  const { inventory, revision, activity } = data
  const [params] = useSearchParams()
  const [tab, setTab] = useState('stations')
  const [search, setSearch] = useState('')
  const [zone, setZone] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [edit, setEdit] = useState(() => params.get('edit') ? inventory.stations.find((station) => station.id === params.get('edit')) : null)
  const [zoneEdit, setZoneEdit] = useState(null)
  const [action, setAction] = useState(null)
  const zones = orderedZones(inventory)
  const matches = inventory.stations.filter((station) => (zone === 'all' || station.zoneId === zone) && `${station.id} ${station.name}`.toLowerCase().includes(search.toLowerCase()) && (stateFilter === 'all' || (stateFilter === 'archived' ? station.archived : stateFilter === 'maintenance' ? Boolean(currentMaintenance(inventory, station.id)) : !station.archived && (stateFilter === 'active' ? station.active : !station.active))))
  return <><div className="ops-management-toolbar"><div className="ops-view-switch" aria-label="Inventory section"><button aria-pressed={tab === 'stations'} onClick={() => setTab('stations')}>Stations</button><button aria-pressed={tab === 'zones'} onClick={() => setTab('zones')}>Zones</button></div>{tab === 'stations' && <Button onClick={() => setEdit('new')}>Add station</Button>}</div>
    {tab === 'stations' ? <><div className="ops-filters"><label>Search stations<input type="search" placeholder="Station ID or name" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Gaming zone<select value={zone} onChange={(event) => setZone(event.target.value)}><option value="all">All zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label>Station state<select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>{['all', 'active', 'inactive', 'maintenance', 'archived'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
    <div className="ops-resource-grid">{matches.map((station) => { const maintenance = currentMaintenance(inventory, station.id); return <article className="ops-panel ops-resource-card" key={station.id}><div className="ops-resource-title"><h2>{station.id.toUpperCase()}</h2><span className="ops-badge">{station.archived ? 'Archived' : maintenance ? 'Maintenance' : station.active ? 'Active' : 'Inactive'}</span></div><h3>{station.name}</h3><p className="ops-muted">{zones.find((zone) => zone.id === station.zoneId)?.name} / {station.equipment}</p><p>{money(station.rate)} / hour / {station.capacity} player capacity</p><div className="ops-form-actions"><Button variant="secondary" onClick={() => setEdit(station)}>Edit station</Button>{!station.archived && <Button variant="secondary" onClick={() => setAction({ type: maintenance ? 'maintenance.end' : 'maintenance.start', station })}>{maintenance ? 'Restore operation' : 'Mark maintenance'}</Button>}<Button variant="secondary" onClick={() => setAction({ type: station.archived ? 'station.restore' : 'station.archive', station })}>{station.archived ? 'Restore station' : 'Archive station'}</Button></div><details className="ops-maintenance-history"><summary>Maintenance history</summary>{inventory.maintenance.filter((item) => item.stationId === station.id).map((item) => <p key={item.id}>{item.reason}<br />{item.startedAt === 0 ? 'Initial demo state' : `${formatDate(item.startedAt)} / ${formatTime(item.startedAt)}`} - {item.endedAt === undefined ? 'Open' : `${formatDate(item.endedAt)} / ${formatTime(item.endedAt)}`}</p>)}</details></article> })}</div>{!matches.length && <p className="ops-empty">No stations match these filters.</p>}</> : <div className="ops-resource-grid">{zones.map((zone) => <article className="ops-panel" key={zone.id}><h2>{zone.name}</h2><p className="ops-muted">{zone.description}</p><p>{inventory.stations.filter((station) => station.zoneId === zone.id && !station.archived).length} non-archived stations / Order {zone.order}</p><p>{zone.archived ? 'Archived' : zone.active ? 'Available' : 'Unavailable'} / ID: {zone.id}</p><Button variant="secondary" onClick={() => setZoneEdit(zone)}>Edit zone</Button><p className="ops-muted">Assign stations using Edit station.</p></article>)}</div>}
    <p className="ops-muted">Resolve saved reservations before maintenance, deactivation, zone reassignment, or archiving. <Link className="ops-text-link" to="/admin/bookings">Open booking management</Link></p><ActivityLog activity={activity} />
    {edit && <StationForm station={edit === 'new' ? null : edit} inventory={inventory} revision={revision} onClose={() => setEdit(null)} />}{zoneEdit && <ZoneForm zone={zoneEdit} revision={revision} onClose={() => setZoneEdit(null)} />}{action && <StationActionDialog {...action} data={data} onClose={() => setAction(null)} />}
  </>
}
