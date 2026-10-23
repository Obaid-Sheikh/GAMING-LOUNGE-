import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { readRepository } from '../../lib/mockRepository'
import Button from '../../components/Button'
import { CommerceAction } from '../../components/admin/CommerceControls'
import ActivityLog from '../../components/admin/ActivityLog'
import { OPEN_HOUR, CLOSE_HOUR, DURATIONS, BOOKING_WINDOW_DAYS } from '../../data/bookingCatalog'
function SettingsForm({ data }) {
  const [values, setValues] = useState(data.settings); const [revision, setRevision] = useState(data.revision); const [confirm, setConfirm] = useState(false)
  return <><form className="ops-form ops-panel" onSubmit={(e) => { e.preventDefault(); setConfirm(true) }}><label>Lounge display name<input required maxLength={100} value={values.displayName} onChange={(e) => setValues({ ...values, displayName: e.target.value })} /></label><label>Contact details<input maxLength={300} value={values.contact} onChange={(e) => setValues({ ...values, contact: e.target.value })} /></label><label>Cancellation policy display<textarea required maxLength={1000} value={values.cancellationPolicy} onChange={(e) => setValues({ ...values, cancellationPolicy: e.target.value })} /></label><p className="ops-muted">Display text only. This does not change eligibility rules or authorize refunds.</p><Button type="submit">Review settings</Button></form>{confirm && <CommerceAction title="Save lounge settings" onSaved={() => setRevision(readRepository().revision)} operation={{ type: 'settings.save', values, expectedRevision: revision }} onClose={() => setConfirm(false)}><p>Save the display name, contact details, and policy text? Scheduled bookings are unchanged.</p></CommerceAction>}</>
}
export default function AdminSettingsPage() {
  const data = useOutletContext()
  return <><SettingsForm data={data} /><section className="ops-panel ops-rule-settings"><h2>Booking rules / read-only</h2><dl className="ops-detail-list"><div><dt>Timezone</dt><dd>Asia/Kolkata</dd></div><div><dt>Operating hours</dt><dd>{OPEN_HOUR}:00-{CLOSE_HOUR}:00 IST</dd></div><div><dt>Booking durations</dt><dd>{DURATIONS.join(', ')} hours</dd></div><div><dt>Booking horizon</dt><dd>{BOOKING_WINDOW_DAYS} days</dd></div></dl><p className="ops-muted">Operational-rule editing is deferred. These values are the same configuration used by customer and admin validation; this page cannot silently invalidate reservations.</p></section><ActivityLog activity={data.activity.filter((event) => event.action.startsWith('settings.'))} /></>
}
