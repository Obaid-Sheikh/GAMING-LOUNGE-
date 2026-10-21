import { useSearchParams } from 'react-router'
import Button from '../components/Button'
import { zones } from '../data/catalog'

export default function BookingPage() {
  const [params] = useSearchParams()
  const zone = zones.find((item) => item.id === params.get('zone'))
  return <main id="main" className="container status-page"><p className="eyebrow">YOUR NEXT SESSION / COMING SOON</p><h1>{zone ? `${zone.name}. Good choice.` : 'Your next session is on the horizon.'}</h1><p>Online booking is upcoming. This preview introduces our gaming zones; it does not accept reservations or show live availability.</p><p>Confirmed games, equipment, prices, opening hours, and booking details will be published when available.</p><Button to="/#zones">Explore the zones ↗</Button></main>
}
