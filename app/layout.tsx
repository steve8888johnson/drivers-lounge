import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import SponsorPopup from '@/components/SponsorPopup';

export const metadata: Metadata = { title: 'Highway Automation', description: 'Direct freight connection for drivers and shippers.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<footer style={{borderTop:'1px solid #e3e8ef',background:'#fff',padding:'24px 20px',marginTop:40}}><div className="wrap row"><div><strong>HIGHWAY AUTOMATION</strong><div className="muted" style={{fontSize:12}}>Direct freight technology for drivers and shippers.</div></div><div style={{display:'flex',gap:16,flexWrap:'wrap'}}><Link href="/advertise">Advertise</Link><Link href="/support">Support</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div></div></footer><SponsorPopup/></body></html>;
}
