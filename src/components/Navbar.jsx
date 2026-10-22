import { Link, useLocation } from 'react-router'
import Button from './Button'
import { useAuth } from '../context/authContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, logout, error } = useAuth()
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null
  return <header className="site-header"><div className="container nav-shell">
    <Link to="/" className="brand" aria-label="Gaming Lounge home"><span className="brand-symbol" aria-hidden="true">G<span>↗</span></span><span>GAMING<span className="brand-sub">LOUNGE</span></span></Link>
    <nav aria-label="Main navigation"><a href="/#zones">The zones</a><a href="/#games">The games</a><a href="/#how-it-works">How it works</a></nav>
    <div className="nav-account">{user ? <><Link to={user.role === 'admin' ? '/admin' : '/dashboard'} aria-current={pathname === '/dashboard' ? 'page' : undefined}>Dashboard</Link><Button variant="secondary" onClick={logout}>Log out</Button></> : <Link to="/login" aria-current={pathname === '/login' ? 'page' : undefined}>Demo login</Link>}<Button to="/booking" aria-current={pathname === '/booking' ? 'page' : undefined}>Book now <span aria-hidden="true">↗</span></Button></div>
  </div>{user && error && <p className="container form-error" role="alert">{error}</p>}</header>
}
