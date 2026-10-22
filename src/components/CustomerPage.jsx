import { NavLink } from 'react-router'
import DemoNotice from './booking/DemoNotice'

export default function CustomerPage({ eyebrow, title, children, actions }) {
  return <main id="main" className="container customer-page">
    <nav className="customer-nav" aria-label="Customer navigation"><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/booking">New booking</NavLink><NavLink to="/my-bookings">My bookings</NavLink></nav>
    <DemoNotice />
    <header className="customer-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{actions}</header>
    {children}
  </main>
}
