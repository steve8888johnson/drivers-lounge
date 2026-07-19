import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';
const tools = [
  { icon: '🧭', title: 'Truck Navigation', text: 'Truck-legal route planning with vehicle, hazmat and oversize settings.', status: 'Phase 2' },
  { icon: '⚖️', title: 'Scales Open', text: 'Crowdsourced weigh-station status, confidence level and recent reports.', status: 'MVP' },
  { icon: '⛽', title: 'Truck Stops', text: 'Search diesel, DEF, showers, food, parking, dog parks and RV hookups.', status: 'MVP' },
  { icon: '🏢', title: 'Carrier Reviews', text: 'FMCSA data plus verified driver feedback about pay, equipment and dispatch.', status: 'MVP' },
  { icon: '🚿', title: 'Road Services', text: 'CAT Scales, Blue Beacon, independent washes, repairs and parking.', status: 'MVP' },
  { icon: '💬', title: 'Driver Rooms', text: 'Public, private and invite-only driver communities with moderation.', status: 'MVP' },
  { icon: '🚨', title: 'Pilot Cars', text: 'Profiles, availability, job postings, forums and credential verification.', status: 'MVP' },
  { icon: '📣', title: 'Petitions', text: 'Verified signatures, evidence submissions and legislative campaigns.', status: 'MVP' },
  { icon: '🪪', title: 'Driver Passport', text: 'Build one reusable professional profile and apply to participating carriers.', status: 'NEW' },
  { icon: '🚛', title: 'My Truck', text: 'Track equipment, maintenance, inspections and document expirations.', status: 'NEW' },
  { icon: '📍', title: 'Freight Intelligence', text: 'Know shipper waits, parking forecasts, broker pay and shop quality before arrival.', status: 'NEW' },
  { icon: '⛽', title: 'Fuel Intelligence', text: 'Compare route-adjusted diesel and DEF cost, discounts and stop impact.', status: 'PLANNED' }
];

const petitions = [
  ['Secure American ELD Records', 'Require tamper-evident records, U.S. accountability and complete edit histories.'],
  ['Stop Driver Deposit Schemes', 'Ban mandatory company-driver deposits and payroll-funded escrow accounts.'],
  ['Expand Truck Parking', 'Fund safer truck parking and real-time availability on major freight corridors.']
];

export default function Home() {
  return (
    <main>
      <SiteHeader/>

      <section className="hero">
        <div>
          <p className="eyebrow">BUILT FOR COMMERCIAL DRIVERS</p>
          <h1>The road app drivers should have had all along.</h1>
          <p className="lead">Free truck tools, carrier intelligence, driver communities, pilot-car jobs and industry advocacy—all in one place.</p>
          <div className="actions"><Link className="button-link" href="/road-tools">Open Road Tools</Link><Link className="button-link secondary" href="/carriers">Explore Carriers</Link></div>
          <p className="free">✓ Navigation and safety tools remain free for drivers.</p>
        </div>
        <div className="dashboard-card">
          <div className="map-placeholder">
            <div className="route"></div>
            <span className="pin p1">⚖️</span><span className="pin p2">⛽</span><span className="pin p3">🚿</span>
          </div>
          <div className="status-row"><b>I-80 East Scale</b><span className="open">Likely Open · 87%</span></div>
          <div className="status-row"><span>14 driver confirmations</span><span>Updated 8 min ago</span></div>
        </div>
      </section>

      <section id="tools" className="section">
        <div className="section-head"><div><p className="eyebrow">ONE DRIVER PLATFORM</p><h2>Everything needed on and off the road</h2></div><p>No premium tier for drivers. Revenue comes from clearly labeled industry advertising.</p></div>
        <div className="grid">{tools.map((t) => <article className="tool" key={t.title}><div className="icon">{t.icon}</div><div className="badge">{t.status}</div><h3>{t.title}</h3><p>{t.text}</p><Link href={t.title === 'Carrier Reviews' ? '/carriers' : t.title === 'Pilot Cars' ? '/pilot-cars' : t.title === 'Petitions' ? '/petitions' : t.title === 'Driver Passport' || t.title === 'My Truck' ? '/driver-hub' : t.title === 'Freight Intelligence' ? '/intelligence' : '/road-tools'}>Open module →</Link></article>)}</div>
      </section>

      <section id="carriers" className="split dark">
        <div><p className="eyebrow">CARRIER INTELLIGENCE</p><h2>Official safety data meets real driver experience.</h2><p>Search carriers by DOT or MC number, compare public FMCSA information and read structured reviews covering equipment, pay, dispatch, home time and benefits.</p><ul><li>Source and update date shown on every official data point</li><li>Verified-driver review badges</li><li>Carrier response and dispute process</li><li>No advertiser can buy a better safety score</li></ul><Link className="button-link" href="/carriers">Search Carriers</Link></div>
        <div className="carrier-card"><div className="carrier-top"><div><small>USDOT 1234567</small><h3>Example Transport LLC</h3></div><span className="verified">Verified</span></div><div className="score"><b>4.2</b><span>Driver rating</span></div><div className="metrics"><span><b>4.5</b> Pay accuracy</span><span><b>3.9</b> Dispatch</span><span><b>4.3</b> Equipment</span><span><b>4.0</b> Home time</span></div><p className="quote">“Newer equipment, steady Midwest lanes and pay was accurate.”</p></div>
      </section>

      <section id="pilot" className="section">
        <div className="section-head"><div><p className="eyebrow">PILOT CAR LOUNGE</p><h2>Jobs, availability and trusted credentials</h2></div><p>Dedicated tools for escort drivers and oversize carriers.</p></div>
        <div className="pilot-grid"><article><h3>Post a pilot-car job</h3><p>List route, dimensions, role, certifications, rate, hotel terms and payment timing.</p><Link className="button-link" href="/pilot-cars">Post Job</Link></article><article><h3>Show availability</h3><p>Mark available now, returning empty, height-pole capable or available on selected dates.</p><Link className="button-link secondary" href="/pilot-cars">Create Profile</Link></article><article><h3>Join pilot-car rooms</h3><p>Discuss state rules, route surveys, equipment, rates, permits and payment problems.</p><Link className="button-link secondary" href="/pilot-cars">Browse Jobs</Link></article></div>
      </section>

      <section id="petitions" className="petitions"><p className="eyebrow">DRIVER ADVOCACY</p><h2>Turn driver experience into documented reform.</h2><div className="petition-list">{petitions.map(([title, text], i) => <article key={title}><div className="petition-number">0{i+1}</div><div><h3>{title}</h3><p>{text}</p></div><Link className="button-link" href="/petitions">Read & Sign</Link></article>)}</div></section>

      <section className="ads"><div><p className="eyebrow">ADVERTISER-SUPPORTED</p><h2>Useful advertising, without charging drivers.</h2><p>Carriers, attorneys, permit services, bookkeepers, repair shops and driver-product companies can purchase clearly labeled listings, banners and audio sponsorships.</p></div><div className="ad-box"><small>SPONSORED</small><h3>CDL Ticket Defense</h3><p>Licensed attorneys searchable by state and practice area.</p><Link className="button-link secondary" href="/advertise">Advertise</Link></div></section>

      <footer><div className="brand"><span>DL</span> Drivers Lounge</div><p>Free commercial-driver tools, community and advocacy.</p><div className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link><Link href="/advertise">Advertise</Link></div><p>© 2026 Drivers Lounge · Public beta</p></footer>
    </main>
  );
}
