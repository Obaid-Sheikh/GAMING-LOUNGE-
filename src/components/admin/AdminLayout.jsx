import { useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/authContext'
import useLoungeData from '../../hooks/useLoungeData'
import useNow from '../../hooks/useNow'
import { adminNavigation } from '../../data/adminLayout'
import { operationalSnapshot } from '../../lib/adminSelectors'
import { formatDate, formatTime, localDate, startOfSlot } from '../../lib/bookingRules'
import Button from '../Button'
import AdminIcon from './AdminIcon'

export default function AdminLayout() {
  const { user, logout, error: authError } = useAuth()
  const data = useLoungeData()
  const { bookings, inventory, activity, revision, error, settings } = data
  const clock = useNow()
  const [preview, setPreview] = useState('now')
  const [navOpen, setNavOpen] = useState(false)
  const toggle = useRef(null)
  const { pathname } = useLocation()
  const section = adminNavigation.find((item) => item.path ? pathname.startsWith(`/admin/${item.path}`) : pathname === '/admin')
  const now = preview === 'now' ? clock : startOfSlot(localDate(clock), Number(preview)) + 30 * 60000
  const snapshot = operationalSnapshot(bookings, now, inventory, data)
  function closeNav() { setNavOpen(false); if (navOpen) toggle.current?.focus() }
  return <div className="admin-shell">
    <aside className={`admin-sidebar ${navOpen ? 'is-open' : ''}`} id="admin-navigation" onKeyDown={(event) => { if (event.key === 'Escape') { closeNav(); toggle.current?.focus() } }}>
      <Link to="/admin" className="ops-brand" onClick={closeNav}>
        <span className="ops-brand-mark">G<span>+</span></span>
        <span>{settings.displayName}<small>OPERATIONS CONTROL</small></span>
      </Link>
      <nav aria-label="Administration">
        <p className="ops-nav-label">WORKSPACE</p>
        {adminNavigation.map((item) => <div key={item.path}>
          {item.path === 'stations' && <p className="ops-nav-label ops-nav-divider">MANAGEMENT</p>}
          <NavLink to={`/admin${item.path ? `/${item.path}` : ''}`} end={!item.path} onClick={closeNav}>
            <AdminIcon name={item.icon} /><span>{item.label}</span>{item.upcoming && <small>Soon</small>}
          </NavLink>
        </div>)}
      </nav>
      <div className="ops-sidebar-footer">
        <div className="ops-environment"><span className="ops-demo-dot" /><strong>Demo environment</strong><p>Your browser. Your workspace.</p></div>
        <Link to="/">Visit public website <AdminIcon name="arrow" size={16} /></Link>
      </div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-header">
        <div className="ops-header-left">
          <button className="ops-icon-button ops-menu-toggle" ref={toggle} onClick={() => setNavOpen(!navOpen)} aria-label="Toggle admin navigation" aria-controls="admin-navigation" aria-expanded={navOpen}><AdminIcon name="menu" /></button>
          <span className="ops-breadcrumb">Operations <span>/</span> <strong>{section?.label ?? 'Administration'}</strong></span>
        </div>
        <div className="ops-header-actions">
          <span className="ops-demo-label"><span className="ops-demo-dot" />Demo data</span>
          <span className="ops-notifications" aria-label="Notifications upcoming" title="Notifications are planned for a later phase"><AdminIcon name="bell" /><small>Soon</small></span>
          <div className="ops-profile-group"><span className="ops-avatar" aria-hidden="true">DA</span><span className="ops-profile">{user.name}<small>Workspace administrator</small></span></div>
          <Button variant="secondary" onClick={logout}>Log out</Button>
        </div>
      </header>
      <main id="main" className="admin-main">
        <div className="ops-page-heading">
          <div><p className="ops-eyebrow">GAMING LOUNGE / CONTROL CENTER</p><h1>{section?.label ?? 'Administration'}</h1><p className="ops-muted">{section?.path === 'floor' ? 'Every station. Every session. One clear view.' : 'Keep your finger on the pulse of the lounge.'}</p></div>
          <div className="ops-snapshot-control">
            <label htmlFor="ops-snapshot"><AdminIcon name="clock" size={15} />Snapshot time / IST</label>
            <select id="ops-snapshot" value={preview} onChange={(event) => setPreview(event.target.value)}><option value="now">Current time</option><option value="12">Demo today / 12:30</option><option value="14">Demo today / 14:30</option></select>
            <small>{formatDate(now)} <span aria-hidden="true">&middot;</span> {formatTime(now)}{preview !== 'now' && ' / Preview'}</small>
          </div>
        </div>
        <details className="ops-demo-notice">
          <summary><span className="ops-demo-dot" /><strong>Demo workspace</strong><span>Sample lounge data and your saved bookings.</span><span className="ops-demo-disclosure">About this data</span></summary>
          <p>The floor plan, recurring reservations, pricing, payments, and food orders are simulated. Customer reservations are saved in this browser. Role checks are frontend only.</p>
        </details>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        {error ? <section className="ops-panel" role="alert"><h2>Booking data is unavailable</h2><p>{error}</p><Button variant="secondary" onClick={() => window.location.reload()}>Retry loading</Button></section> : <Outlet context={{ ...data, snapshot, now, inventory, activity, revision, bookings, isPreview: preview !== 'now' }} />}
      </main>
    </div>
  </div>
}
