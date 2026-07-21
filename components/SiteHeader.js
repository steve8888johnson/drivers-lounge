import Link from 'next/link';
import Image from 'next/image';
import AuthStatus from './AuthStatus';

export default function SiteHeader(){
  return <header className="topbar clean-topbar">
    <Link className="brand clean-brand" href="/">
      <Image src="/drivers-lounge-logo.png" alt="Drivers Lounge" width={42} height={58}/>
      <span className="brand-copy"><strong>Drivers Lounge</strong><small>Built by drivers for drivers</small></span>
    </Link>
    <nav>
      <Link href="/navigation">Navigate</Link>
      <Link href="/road-tools">Road Intel</Link>
      <Link href="/carriers">Carriers</Link>
      <Link href="/jobs">Jobs</Link>
      <Link href="/community">Community</Link>
      <Link href="/pilot-cars">Pilot Cars</Link>
    </nav>
    <AuthStatus/>
  </header>
}
