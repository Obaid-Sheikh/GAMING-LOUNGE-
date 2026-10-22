import AdminIcon from './AdminIcon'

export default function EmptyState({ icon = 'check', title, children }) {
  return <div className="ops-empty"><span className="ops-empty-icon"><AdminIcon name={icon} size={24} /></span><div><strong>{title}</strong><p>{children}</p></div></div>
}
