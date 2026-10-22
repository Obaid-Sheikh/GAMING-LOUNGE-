import { formatDate, formatTime } from '../../lib/bookingRules'
export default function ActivityLog({ activity, target }) {
  const events = target ? activity.filter((event) => event.target === target) : activity
  return <details className="ops-panel ops-activity-log"><summary>Admin activity ({events.length})</summary>{!events.length ? <p className="ops-muted">No administrative actions recorded yet.</p> : <ol>{events.map((event) => <li key={event.id}><strong>{event.action}</strong><span>{event.target} / {event.adminId}</span><time>{formatDate(event.at)} / {formatTime(event.at)} IST</time><details><summary>Previous and new values</summary><pre>{JSON.stringify({ before: event.before, after: event.after }, null, 2)}</pre></details></li>)}</ol>}</details>
}
