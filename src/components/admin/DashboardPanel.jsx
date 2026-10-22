import AdminIcon from './AdminIcon'

export default function DashboardPanel({ title, count, action, children, icon, subtitle }) {
  return <section className="ops-panel">
    <div className="ops-panel-heading">
      <div className="ops-panel-title">
        {icon && <span className="ops-panel-icon"><AdminIcon name={icon} size={19} /></span>}
        <div><h2>{title}{count !== undefined && <span className="ops-count">{count}</span>}</h2>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {action}
    </div>
    {children}
  </section>
}
