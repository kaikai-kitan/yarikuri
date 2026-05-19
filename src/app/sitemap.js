import { getAllColumnSlugs } from '@/lib/content';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yarikuri.pages.dev';

export default function sitemap() {
  const staticRoutes = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE_URL}/fridge/`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE_URL}/recipes/`, lastModified: new Date(), priority: 0.9 },
    { url: `${BASE_URL}/column/`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE_URL}/privacy/`, lastModified: new Date(), priority: 0.3 },
  ];

  const columnRoutes = getAllColumnSlugs().map((slug) => ({
    url: `${BASE_URL}/column/${slug}/`,
    lastModified: new Date(),
    priority: 0.7,
  }));

  return [...staticRoutes, ...columnRoutes];
}
