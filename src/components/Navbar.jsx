import { Link, useLocation } from 'react-router'
import Button from './Button'

export default function Navbar() {
  const { pathname } = useLocation()
  return <header className="site-header"><div className="container nav-shell">
    <Link to="/" className="brand" aria-label="Gaming Lounge home"><span className="brand-symbol" aria-hidden="true">G<span>↗</span></span><span>GAMING<span className="brand-sub">LOUNGE</span></span></Link>
    <nav aria-label="Main navigation"><a href="/#zones">The zones</a><a href="/#games">The games</a><a href="/#how-it-works">How it works</a></nav>
    <Button to="/booking" aria-current={pathname === '/booking' ? 'page' : undefined}>Book now <span aria-hidden="true">↗</span></Button>
  </div></header>
}
