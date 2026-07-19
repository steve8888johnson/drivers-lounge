import Link from 'next/link';
import AuthStatus from './AuthStatus';
export default function SiteHeader(){return <header className="topbar"><Link className="brand" href="/"><span>DL</span> Drivers Lounge</Link><nav><Link href="/road-tools">Road Tools</Link><Link href="/carriers">Carriers</Link><Link href="/intelligence">Intelligence</Link><Link href="/pilot-cars">Pilot Cars</Link><Link href="/petitions">Petitions</Link></nav><AuthStatus/></header>}
