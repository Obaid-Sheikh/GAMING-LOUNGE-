import { Link } from 'react-router'

export default function GamingZoneCard({ zone }) {
  return <article className={`zone-card zone-${zone.id}`}><div className="zone-art" aria-hidden="true"><span className="zone-number">0{zone.number} / ZONE</span><span className="zone-icon">{zone.symbol}</span><span className="zone-word">{zone.word}</span></div><div className="zone-body"><p className="eyebrow">{zone.tag}</p><h3>{zone.name}</h3><p>{zone.description}</p><Link className="text-link" to={`/booking?zone=${zone.id}`}>Explore this zone <span aria-hidden="true">↗</span></Link></div></article>
}
