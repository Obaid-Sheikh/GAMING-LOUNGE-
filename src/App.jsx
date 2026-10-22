import { BrowserRouter, Route, Routes } from 'react-router'
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
import './styles/customer.css'

export default function App() {
  return <BrowserRouter><AuthProvider>
    <RouteEffects />
    <a className="skip-link" href="#main">Skip to content</a>
    <Navbar />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/booking/confirmation/:id" element={<BookingConfirmationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
      </Route>
      <Route path="*" element={<main id="main" className="container status-page"><p className="eyebrow">404 / OFF THE MAP</p><h1>Let’s get you back in the game.</h1><Button to="/">Back to home ↗</Button></main>} />
    </Routes>
    <Footer />
  </AuthProvider></BrowserRouter>
}
