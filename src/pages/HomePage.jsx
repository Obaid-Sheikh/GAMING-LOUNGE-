import useLoungeData from '../hooks/useLoungeData'
import Button from '../components/Button'
import SectionHeading from '../components/SectionHeading'
import GamingZoneCard from '../components/GamingZoneCard'
import { games } from '../data/catalog'

const steps = [
  ['Pick your playground', 'Console, PC, or a group watch session. Find your kind of downtime.'],
  ['Choose your session', 'Explore mock availability and choose your demo date, time, and duration.'],
  ['Review. Confirm. You’re set.', 'Review your session and save a demo reservation in this browser.'],
]
const benefits = [
  ['01', 'Find your kind of play', 'Explore console, PC, and group entertainment in one place.'],
  ['02', 'Make it a squad thing', 'Turn the group chat into a plan, with something for different moods.'],
  ['03', 'Take a proper break', 'Step away from the everyday and make time for the things you enjoy.'],
]

export default function HomePage() {
  const { inventory } = useLoungeData()
  const zones = inventory.zones.filter((zone) => zone.active && !zone.archived).sort((a, b) => a.order - b.order)
  return <main id="main">
    <section className="hero-section container" aria-labelledby="hero-title">
      <div className="hero-copy"><p className="eyebrow"><span className="status-dot" /> YOUR NEXT HANGOUT. REIMAGINED.</p><h1 id="hero-title">Log off the ordinary.<br /><span>Level up</span><br />your downtime.</h1><p className="hero-description">Big plays. Friendly rivalries. Great company.<br />Find your escape at Gaming Lounge.</p><div className="hero-actions"><Button to="/booking">Book now <span aria-hidden="true">↗</span></Button><Button to="/#zones" variant="secondary">Explore the zones <span aria-hidden="true">↓</span></Button></div><p className="hero-note">Try demo booking. No real reservation or payment.</p></div>
      <div className="hero-art" role="img" aria-label="Illustration of a gaming setup with a neon green monitor, controller, and keyboard"><div className="art-grid" /><span className="art-topline">ENTER YOUR ELEMENT <span>↗</span></span><div className="monitor"><div className="monitor-screen"><span className="screen-small">LEAVE ORDINARY BEHIND</span><span className="screen-title">LET’S<br /><i>PLAY.</i></span><span className="screen-cross">+</span></div><div className="monitor-stand" /></div><div className="keyboard-art" /><div className="controller-art"><span>+</span><span>••<br />••</span></div><div className="art-label"><span className="status-dot" /> BUILT FOR YOUR NEXT CHAPTER</div><span className="art-index">GL / 001</span></div>
    </section>
    <div className="platform-strip"><div className="container platform-list"><span>FOUR WAYS TO SWITCH OFF.</span><span>PlayStation</span><span>Xbox</span><span>PC GAMING</span><span>NETFLIX & CHILL</span><span aria-hidden="true">✳</span></div></div>
    <section id="zones" className="container section-space"><SectionHeading eyebrow="01 / FIND YOUR ZONE" title={<>Different worlds.<br />Same good time.</>}>Go competitive, go co-op, or just kick back. There’s a zone for your kind of session.</SectionHeading><p className="demo-note">Zone concepts · Demo catalog · Equipment and facilities to be confirmed</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{zones.map((zone) => <GamingZoneCard key={zone.id} zone={zone} />)}</div></section>
    <section id="games" className="games-section section-space"><div className="container"><SectionHeading eyebrow="02 / ON THE PLAYLIST" title="Your next obsession.">A little competition. A new adventure. Explore a taste of what a session could look like.</SectionHeading><p className="demo-note">Featured mock titles · Illustrative artwork · Game availability is not confirmed</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{games.map((game) => <article className="game-card" key={game.id}><div className={`game-art ${game.art}`} aria-hidden="true"><span className="game-platform">{game.platform}</span><span className="game-mark">{game.mark}</span><span className="game-caption">{game.caption}</span></div><div className="game-info"><h3>{game.name}</h3><p>{game.genre}</p></div></article>)}</div></div></section>
    <section id="how-it-works" className="container section-space"><SectionHeading eyebrow="03 / LESS PLANNING. MORE PLAYING." title="From ‘you in?’ to game on.">Try the frontend booking journey. All availability and reservations are demo data.</SectionHeading><ol className="steps">{steps.map(([title, description], index) => <li key={title}><span className="step-number">0{index + 1}<span aria-hidden="true">↗</span></span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
    <section className="container why-section" aria-labelledby="why-title"><div><p className="eyebrow">04 / WHY CHOOSE US</p><h2 id="why-title">Good games.<br /><span>Better together.</span></h2><p>Make room for a little friendly competition, a shared adventure, or an evening with your favorite people.</p></div><div className="benefits">{benefits.map(([number, title, description]) => <div className="benefit" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div></section>
    <section className="container section-space" aria-labelledby="cta-title"><div className="final-cta"><div><p className="eyebrow">NEXT UP: YOUR CREW.</p><h2 id="cta-title">Make time for <span>play.</span></h2><p>Your next great session starts with picking a zone.</p></div><div><Button to="/booking">Book your session <span aria-hidden="true">↗</span></Button><p className="cta-note">Demo booking · No real reservation</p></div></div></section>
  </main>
}

