import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/authContext'
import Button from '../Button'

export default function ProtectedRoute({ role = 'customer' }) {
  const { user, logout, error } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  if (user.role !== role) return <main id="main" className="container status-page"><p className="eyebrow">403 / DEMO ROLE ACCESS</p><h1>Access denied.</h1><p className="muted-copy">This area requires a demo {role} account. You are signed in as a {user.role}.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><Button to={user.role === 'admin' ? '/admin' : '/dashboard'}>Return to your dashboard</Button><Button variant="secondary" onClick={logout}>Log out to switch demo role</Button></div></main>
  return <Outlet />
}
