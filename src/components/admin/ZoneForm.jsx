import { useState } from 'react'
import { runAdmin } from '../../lib/adminManagement'
import Button from '../Button'
import ManagementDialog from './ManagementDialog'
export default function ZoneForm({ zone, revision, onClose }) {
  const [input, setInput] = useState({ ...zone })
  const [baseRevision] = useState(revision)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function save(event) {
    event.preventDefault(); setPending(true); setError('')
    try { await runAdmin({ type: 'zone.save', id: zone.id, values: input, expectedRevision: baseRevision }); onClose() } catch (error) { setError(error.message) } finally { setPending(false) }
  }
  return <ManagementDialog title="Edit zone" onClose={onClose}><form className="ops-form" onSubmit={save}><p className="ops-muted">Stable ID: {zone.id}. Reassign stations from their station form. Resolve reservations before disabling this zone; archive its stations before archiving the zone.</p><label>Zone name<input required maxLength={100} value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} /></label><label>Description<textarea maxLength={1000} value={input.description} onChange={(event) => setInput({ ...input, description: event.target.value })} /></label><label>Display order<input type="number" min="0" max="99" required value={input.order} onChange={(event) => setInput({ ...input, order: Number(event.target.value) })} /></label><label className="ops-inline-check"><input type="checkbox" checked={input.active} onChange={(event) => setInput({ ...input, active: event.target.checked })} />Zone available for bookings</label><label className="ops-inline-check"><input type="checkbox" checked={input.archived} onChange={(event) => setInput({ ...input, archived: event.target.checked, active: !event.target.checked })} />Archive zone</label>{error && <p className="form-error" role="alert">{error}</p>}<div className="ops-form-actions"><Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save zone'}</Button><Button variant="secondary" onClick={onClose}>Cancel</Button></div></form></ManagementDialog>
}
