import './globals.css';
import type { Metadata } from 'next';
import SponsorPopup from '@/components/SponsorPopup';

export const metadata: Metadata = { title: 'Highway Automation', description: 'Direct freight connection for drivers and shippers.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<SponsorPopup/></body></html>;
}
