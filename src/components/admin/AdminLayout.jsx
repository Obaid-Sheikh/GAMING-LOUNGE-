import { useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/authContext'
import useBookings from '../../hooks/useBookings'
import useNow from '../../hooks/useNow'
import { adminNavigation } from '../../data/adminLayout'
import { operationalSnapshot } from '../../lib/adminSelectors'
import { formatDate, formatTime, localDate, startOfSlot } from '../../lib/bookingRules'
import Button from '../Button'
import AdminIcon from './AdminIcon'

export default function AdminLayout() {
  const { user, logout, error: authError } = useAuth()
  const { bookings, error } = useBookings()
  const clock = useNow()
  const [preview, setPreview] = useState('now')
  const [navOpen, setNavOpen] = useState(false)
  const toggle = useRef(null)
  const { pathname } = useLocation()
  const section = adminNavigation.find((item) => item.path ? pathname.startsWith(`/admin/${item.path}`) : pathname === '/admin')
  const now = preview === 'now' ? clock : startOfSlot(localDate(clock), Number(preview)) + 30 * 60000
  const snapshot = operationalSnapshot(bookings, now)
  function closeNav() { setNavOpen(false); if (navOpen) toggle.current?.focus() }
  return <div className="admin-shell">
    <aside className={`admin-sidebar ${navOpen ? 'is-open' : ''}`} id="admin-navigation" onKeyDown={(event) => { if (event.key === 'Escape') { closeNav(); toggle.current?.focus() } }}>
      <Link to="/admin" className="ops-brand" onClick={closeNav}><span className="ops-brand-mark">G<span>+</span></span><span>GAMING LOUNGE<small>OPERATIONS CONSOLE</small></span></Link>
      <p className="ops-nav-label">WORKSPACE</p>
      <nav aria-label="Administration">{adminNavigation.map((item) => <NavLink key={item.path} to={`/admin${item.path ? `/${item.path}` : ''}`} end={!item.path} onClick={closeNav}><AdminIcon name={item.icon} /><span>{item.label}</span>{item.upcoming && <small>Soon</small>}</NavLink>)}</nav>
      <div className="ops-sidebar-footer"><span className="ops-demo-dot" /> LOCAL DEMO ENVIRONMENT<p>Browser data only. No live lounge connection.</p><Link to="/">Visit public website <span aria-hidden="true">&rarr;</span></Link></div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-header"><div className="ops-header-left"><button className="ops-icon-button ops-menu-toggle" ref={toggle} onClick={() => setNavOpen(!navOpen)} aria-label="Toggle admin navigation" aria-controls="admin-navigation" aria-expanded={navOpen}><AdminIcon name="menu" /></button><span className="ops-breadcrumb">Workspace <span>/</span> <strong>{section?.label ?? 'Administration'}</strong></span></div><div className="ops-header-actions"><span className="ops-demo-label">Demo data</span><span className="ops-notifications" aria-label="Notifications upcoming" title="Notifications are planned for a later phase"><AdminIcon name="bell" /><small>Soon</small></span><span className="ops-avatar" aria-hidden="true">DA</span><span className="ops-profile">{user.name}<small>Demo admin</small></span><Button variant="secondary" onClick={logout}>Log out</Button></div></header>
      <main id="main" className="admin-main">
        <div className="ops-page-heading"><div><p className="ops-eyebrow">LOUNGE OPERATIONS / PHASE 3A</p><h1>{section?.label ?? 'Administration'}</h1><p className="ops-muted">{section?.path === 'floor' ? 'A clear view of every station, session, and zone.' : 'Your lounge at a glance. Everything in one place.'}</p></div><div className="ops-snapshot-control"><label htmlFor="ops-snapshot">Snapshot time / IST</label><select id="ops-snapshot" value={preview} onChange={(event) => setPreview(event.target.value)}><option value="now">Current time</option><option value="12">Demo today / 12:30</option><option value="14">Demo today / 14:30</option></select><small>{formatDate(now)} / {formatTime(now)}{preview !== 'now' && ' / Preview'}</small></div></div>
        <div className="ops-demo-notice"><span className="ops-demo-dot" /><p><strong>Demo workspace.</strong> Sample floor plan, recurring reservation fixtures, and this browser's customer bookings. Pricing, payments, and orders are simulated. Role checks are frontend only.</p></div>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        {error ? <section className="ops-panel" role="alert"><h2>Booking data is unavailable</h2><p>{error}</p><Button variant="secondary" onClick={() => window.location.reload()}>Retry loading</Button></section> : <Outlet context={{ snapshot, now }} />}
      </main>
    </div>
  </div>
}
