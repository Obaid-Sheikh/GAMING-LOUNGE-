import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../context/authContext'
import Button from '../components/Button'
import DemoNotice from '../components/booking/DemoNotice'

export default function LoginPage() {
  const { user, error, login } = useAuth()
  const { state } = useLocation()
  const requested = state?.from
  // Only resume known local customer routes; never accept external redirects.
  const destination = typeof requested === 'string' && /^\/(booking(?:\/confirmation\/[^/?#]+)?|dashboard|my-bookings)(?:[?#].*)?$/.test(requested) ? requested : '/dashboard'
  if (user) return <Navigate to={destination} replace />

  return <main id="main" className="container login-page">
    <DemoNotice />
    <div className="login-layout"><section><p className="eyebrow">PLAYER ACCESS / DEMO MODE</p><h1>Your next session<br /><span>starts here.</span></h1><p className="muted-copy">Try the customer experience: find a station, build your session, and manage your demo reservations.</p><Button to="/#zones" variant="secondary">Explore the zones ↗</Button></section>
      <section className="customer-panel login-card" aria-labelledby="login-title"><span className="player-avatar" aria-hidden="true">GL</span><h2 id="login-title">Welcome, player.</h2><p className="muted-copy">One demo profile. No password or real credentials needed.</p><dl className="booking-details"><div><dt>Demo name</dt><dd>Demo Player</dd></div><div><dt>Demo email</dt><dd>player@example.test</dd></div></dl>{error && <p role="alert" className="form-error">{error}</p>}<Button onClick={login}>Continue as demo customer ↗</Button><p className="field-hint">Demo login is saved in this browser. Logging out keeps your demo booking history.</p></section>
    </div>
  </main>
}
