import './styles.css';

export const metadata = {
  title: 'Drivers Lounge',
  description: 'Free tools, community, jobs and advocacy for commercial drivers.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Drivers Lounge', statusBarStyle: 'black-translucent' }
};

export const viewport = { themeColor: '#f4b400' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
