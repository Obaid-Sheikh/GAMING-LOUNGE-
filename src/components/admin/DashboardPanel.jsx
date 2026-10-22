export default function DashboardPanel({ title, count, action, children }) {
  return <section className="ops-panel"><div className="ops-panel-heading"><h2>{title}{count !== undefined && <span className="ops-count">{count}</span>}</h2>{action}</div>{children}</section>
}
