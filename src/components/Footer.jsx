import { Link } from 'react-router'

export default function Footer() {
  return <footer className="site-footer"><div className="container footer-top"><Link to="/" className="footer-brand">GAMING LOUNGE<span>Your next session starts here.</span></Link><nav aria-label="Footer navigation"><a href="/#zones">Explore zones</a><a href="/#games">Featured games</a><Link to="/booking">Booking information</Link></nav></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Gaming Lounge</span><span>Play. Connect. Repeat.</span></div></footer>
}
