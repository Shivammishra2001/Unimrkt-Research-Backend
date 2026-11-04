import type { Core } from '@strapi/strapi';

/** Website path of each `page` entry whose route is not simply `/<slug>` (the dedicated Next.js routes). */
const PAGE_ROUTES: Record<string, string> = {
  home: '/',
  'about-us': '/our-company',
  'case-studies': '/case-study',
  blog: '/blogs',
};

/** Collection → how a published entry's slug maps onto a website path. */
const SOURCES: Array<{ uid: any; path: (slug: string) => string }> = [
  { uid: 'api::page.page', path: (slug) => PAGE_ROUTES[slug] ?? `/${slug}` },
  { uid: 'api::industry.industry', path: (slug) => `/industries/${slug}` },
  { uid: 'api::service.service', path: (slug) => `/services/${slug}` },
  { uid: 'api::blog.blog', path: (slug) => `/blogs/${slug}` },
  { uid: 'api::case-study.case-study', path: (slug) => `/case-study/${slug}` },
];

/** Website paths whose "Page visibility" switch is OFF. */
export async function getInactivePaths(strapi: Core.Strapi): Promise<Set<string>> {
  const paths = new Set<string>();
  await Promise.all(
    SOURCES.map(async ({ uid, path }) => {
      const rows = (await strapi.documents(uid).findMany({
        status: 'published',
        filters: { isActive: { $eq: false } },
        fields: ['slug'],
        populate: {},
      })) as Array<{ slug?: string }>;
      rows.forEach((row) => row.slug && paths.add(path(row.slug)));
    })
  );
  return paths;
}

/** True for an internal link (`/x`, `/x/`, `/x?y`, `/x#y`) that points at an inactive page. External links are never hidden. */
export function pointsAtInactive(href: string | null | undefined, inactive: Set<string>): boolean {
  if (!href || !href.startsWith('/')) return false;
  const clean = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return inactive.has(clean);
}
