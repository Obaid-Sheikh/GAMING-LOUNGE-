const symbols = { Available: '\u2713', Reserved: '\u25f7', Occupied: '\u25b6', Maintenance: '\u2692' }
export default function StatusBadge({ status }) {
  return <span className={`ops-badge ops-${status.toLowerCase()}`}><span aria-hidden="true">{symbols[status] ?? '\u00b7'}</span>{status}</span>
}
