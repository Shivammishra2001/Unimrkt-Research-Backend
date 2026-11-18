/**
 * Fills the site-wide closing bands in "Global Header, Footer & SEO" with the copy every page shows today:
 *
 *   Blog Band   "Latest Blogs" / "Exploring Market Trends" / "Discover Emerging Market Trends…"
 *   FAQ Band    "Frequently Asked Questions" + "Browse Blogs" -> /blogs (the button shows only where a page design has it)
 *   Final CTA   "Start Your Research Journey" / "Partner with Unimrkt Research…" / "Talk to Our Experts" -> /contact
 *
 * Pages (services, industries, Contact, Careers, Our Company) have optional overrides of the same three bands; they are
 * left empty so every page inherits these Global values. Each band is written only while it is empty in Global, so an
 * editor's text is never overwritten. Republishes Global only when something changed.
 *
 * Run once per environment:  npm run seed:closing-bands
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';

const UID = 'api::global.global';

const DEFAULTS = {
  blogBand: {
    eyebrow: 'Latest Blogs',
    heading: 'Exploring Market Trends',
    description: 'Discover Emerging Market Trends That Shape Smarter Business Decisions.',
  },
  faqBand: {
    heading: 'Frequently Asked Questions',
    cta: { label: 'Browse Blogs', href: '/blogs', isExternal: false, variant: 'primary' },
  },
  finalCta: {
    heading: 'Start Your Research Journey',
    body: 'Partner with Unimrkt Research to uncover actionable market intelligence, understand your industry, and make confident business decisions.',
    action: { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' },
  },
};

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  try {
    const g = await strapi.documents(UID).findFirst({ status: 'draft', populate: { blogBand: true, faqBand: { populate: { cta: true } }, finalCta: { populate: { action: true } } } });
    if (!g) {
      // eslint-disable-next-line no-console
      console.log('[closing-bands] no Global entry — nothing to do');
      return;
    }
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>) if (!g[key]) data[key] = DEFAULTS[key];
    if (Object.keys(data).length === 0) {
      // eslint-disable-next-line no-console
      console.log('[closing-bands] Global bands already set — unchanged');
      return;
    }
    const live = await strapi.documents(UID).findFirst({ status: 'published', fields: ['id'] });
    await strapi.documents(UID).update({ documentId: g.documentId, data });
    if (live) await strapi.documents(UID).publish({ documentId: g.documentId });
    // eslint-disable-next-line no-console
    console.log(`[closing-bands] Global filled: ${Object.keys(data).join(', ')}`);
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error('[closing-bands] failed:', err);
    process.exit(1);
  },
);
