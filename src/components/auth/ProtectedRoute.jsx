import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/authContext'

export default function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
}
