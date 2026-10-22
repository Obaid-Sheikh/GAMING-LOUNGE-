import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import BookingPage from './pages/BookingPage'
import Button from './components/Button'
import RouteEffects from './components/RouteEffects'
import AuthProvider from './context/AuthProvider'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MyBookingsPage from './pages/MyBookingsPage'
import BookingConfirmationPage from './pages/BookingConfirmationPage'
import AdminStationsPage from './pages/admin/AdminStationsPage'
import AdminBookingsPage from './pages/admin/AdminBookingsPage'
import AdminLayout from './components/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminFloorPage from './pages/admin/AdminFloorPage'
import AdminUpcomingPage from './pages/admin/AdminUpcomingPage'
import AdminBookingPage from './pages/admin/AdminBookingPage'
import './styles/customer.css'
import './styles/admin.css'

function PublicLayout() {
  return <><Navbar /><Outlet /><Footer /></>
}

export default function App() {
  return <BrowserRouter><AuthProvider>
    <RouteEffects />
    <a className="skip-link" href="#main">Skip to content</a>
    <Routes>
      <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/booking/confirmation/:id" element={<BookingConfirmationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
      </Route>
      <Route path="*" element={<main id="main" className="container status-page"><p className="eyebrow">404 / OFF THE MAP</p><h1>Let’s get you back in the game.</h1><Button to="/">Back to home ↗</Button></main>} />
      </Route>
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="floor" element={<AdminFloorPage />} />
          <Route path="stations" element={<AdminStationsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:id" element={<AdminBookingPage />} />
          <Route path="*" element={<AdminUpcomingPage />} />
        </Route>
      </Route>
    </Routes>
  </AuthProvider></BrowserRouter>
}
