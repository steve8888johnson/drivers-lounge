export default function manifest() {
  return {
    name: 'Drivers Lounge',
    short_name: 'Drivers Lounge',
    description: 'Free tools, community, jobs and advocacy for commercial drivers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07111f',
    theme_color: '#f4b400',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
    ]
  };
}
