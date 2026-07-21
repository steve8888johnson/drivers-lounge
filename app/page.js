import Link from 'next/link';
import Image from 'next/image';
import SiteHeader from '../components/SiteHeader';

const highlights = [
  {
    label: 'NAVIGATION',
    title: 'Plan a truck-safe trip',
    text: 'Set vehicle dimensions, hazmat status and oversize requirements before choosing a route.',
    href: '/navigation',
    action: 'Start route'
  },
  {
    label: 'LIVE ROAD INTELLIGENCE',
    title: 'See what is ahead',
    text: 'Check scale reports, parking, weather, fuel, road events and truck services in one place.',
    href: '/road-tools',
    action: 'Open road intelligence'
  },
  {
    label: 'DRIVER COMMUNITY',
    title: 'Built from driver experience',
    text: 'Review carriers, join rooms, find pilot-car work and support driver petitions.',
    href: '/community',
    action: 'Enter the lounge'
  }
];

export default function Home() {
  return (
    <main className="home-clean">
      <SiteHeader />

      <section className="clean-hero">
        <div className="clean-hero-copy">
          <p className="eyebrow">THE ROAD APP FOR COMMERCIAL DRIVERS</p>
          <h1>Everything drivers need.<br/>Nothing they should have to pay for.</h1>
          <p className="lead">Truck-focused navigation, live road intelligence, carrier information and driver community tools—together in one dependable platform.</p>
          <div className="actions">
            <Link className="button-link" href="/navigation">Start Navigation</Link>
            <Link className="button-link secondary" href="/road-tools">Check Road Conditions</Link>
          </div>
          <div className="trust-row">
            <span>✓ Free for drivers</span>
            <span>✓ Built around commercial vehicles</span>
            <span>✓ Driver-reported intelligence</span>
          </div>
        </div>

        <div className="clean-logo-panel" aria-label="Drivers Lounge logo">
          <Image
            src="/drivers-lounge-logo.png"
            alt="Drivers Lounge interstate shield with a black classic Kenworth-style truck and the words Built by Drivers for Drivers"
            width={430}
            height={1005}
            priority
          />
        </div>
      </section>

      <section className="clean-highlights">
        {highlights.map((item) => (
          <article key={item.title}>
            <p className="eyebrow">{item.label}</p>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <Link href={item.href}>{item.action} →</Link>
          </article>
        ))}
      </section>

      <section className="clean-status-band">
        <div>
          <p className="eyebrow">PUBLIC BETA</p>
          <h2>Built by drivers, for drivers.</h2>
          <p>The platform is growing module by module. Live-data integrations are identified clearly, and driver safety tools remain free.</p>
        </div>
        <Link className="button-link secondary" href="/support">Report a problem</Link>
      </section>

      <footer className="clean-footer">
        <div className="brand"><span>DL</span> Drivers Lounge</div>
        <p>Built by drivers for drivers.</p>
        <div className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link><Link href="/advertise">Advertise</Link></div>
        <p>© 2026 Drivers Lounge · Public beta</p>
      </footer>
    </main>
  );
}
