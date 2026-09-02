import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://highwayautomation.com';
  return ['/', '/loadboard', '/pricing', '/advertise', '/support', '/terms', '/privacy'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/loadboard' ? 'hourly' : 'weekly',
    priority: path === '/' ? 1 : path === '/loadboard' ? 0.9 : 0.6,
  }));
}
