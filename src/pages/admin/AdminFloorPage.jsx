import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { floorZones, stationPositions } from '../../data/adminLayout'
import { operatingStates } from '../../lib/adminSelectors'
import StatusBadge from '../../components/admin/StatusBadge'
import StationNode from '../../components/admin/StationNode'
import StationDrawer from '../../components/admin/StationDrawer'
import AdminIcon from '../../components/admin/AdminIcon'

export default function AdminFloorPage() {
  const { snapshot, now } = useOutletContext()
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('map')
  const [filter, setFilter] = useState('all')
  const selectedView = snapshot.stationViews.find((view) => view.station.id === selected)
  return <>
    <section className="ops-panel ops-floor-panel"><div className="ops-floor-toolbar"><div><h2><AdminIcon name="floor" /> Lounge floor</h2><p className="ops-muted">Sample layout / {snapshot.stationViews.length} stations / Hover, focus, or tap to inspect</p></div><div className="ops-floor-controls"><label className="ops-filter">Zone<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All zones</option>{floorZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><div className="ops-view-switch" aria-label="Floor display"><button aria-pressed={mode === 'map'} onClick={() => setMode('map')}>Floor plan</button><button aria-pressed={mode === 'grid'} onClick={() => setMode('grid')}>Station grid</button></div></div></div>
      <div className="ops-floor-legend">{operatingStates.map((status) => <span key={status}><StatusBadge status={status} /><strong>{snapshot.counts[status]}</strong></span>)}</div>
      <p className="ops-mobile-floor-note">Compact station grid shown on smaller screens.</p>
      <div className={`ops-floor ${mode === 'grid' || filter !== 'all' ? 'ops-floor-grid' : ''}`}>
        {floorZones.filter((zone) => filter === 'all' || filter === zone.id).map((zone) => <section key={zone.id} className={`ops-floor-zone ops-zone-${zone.id}`} style={{ gridArea: zone.gridArea }} aria-labelledby={`zone-title-${zone.id}`}><div className="ops-zone-heading"><h3 id={`zone-title-${zone.id}`}>{zone.name}</h3><small>{snapshot.stationViews.filter((view) => view.station.zoneId === zone.id).length} STATIONS</small></div><div className="ops-zone-stations" style={{ '--station-columns': zone.columns }}>{snapshot.stationViews.filter((view) => view.station.zoneId === zone.id).map((view) => <StationNode key={view.station.id} view={view} now={now} position={stationPositions[view.station.id]} selected={selected === view.station.id} onSelect={setSelected} />)}</div></section>)}
        <div className="ops-walkway ops-walkway-horizontal" aria-label="Central walkway"><span>WALKWAY / KEEP CLEAR</span></div><div className="ops-walkway ops-walkway-vertical" aria-hidden="true" />
        <section className="ops-reception" aria-label="Reception area"><span className="ops-reception-desk"><AdminIcon name="grid" /><strong>RECEPTION</strong></span><span>ENTRANCE &uarr;</span></section>
      </div>
      <p className="ops-floor-footnote">Illustrative positions, configured separately from the shared station catalog. Reserved means a pending hold or an upcoming reservation today. Occupied requires a confirmed session in progress.</p>
    </section>
    {selectedView && <StationDrawer view={selectedView} now={now} onClose={() => setSelected(null)} />}
  </>
}
