import Link from 'next/link';

export default function NotFound(){return <main className="form"><div className="kicker">404</div><h1>That road doesn’t go anywhere.</h1><p className="muted">The page you requested could not be found.</p><div className="row" style={{justifyContent:'flex-start'}}><Link className="btn primary" href="/">Home</Link><Link className="btn secondary" href="/loadboard">Load Board</Link></div></main>}
