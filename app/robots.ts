import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/dashboard/', '/documents/', '/notifications/', '/account/', '/api/'] }],
    sitemap: '/sitemap.xml',
  };
}
