import { Link, useLocation } from 'react-router'
import { adminNavigation } from '../../data/adminLayout'
import AdminIcon from '../../components/admin/AdminIcon'

export default function AdminUpcomingPage() {
  const { pathname } = useLocation()
  const section = adminNavigation.find((item) => pathname === `/admin/${item.path}`)
  return <section className="ops-panel ops-upcoming"><AdminIcon name={section?.icon ?? 'grid'} size={48} /><p className="ops-eyebrow">{section ? 'UPCOMING / PHASE 3C' : 'PAGE NOT FOUND'}</p><h2>{section ? `${section.label} is on the roadmap.` : 'This admin page could not be found.'}</h2><p className="ops-muted">{section ? 'This workspace is reserved for a later phase. Station, zone, booking, and session management are available from the sidebar. This section is deferred to Phase 3C.' : 'Return to the overview or lounge floor to continue.'}</p><Link to="/admin/floor" className="button button-primary">Explore the lounge floor</Link></section>
}
