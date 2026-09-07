/**
 * Idempotent seed script for Unimrkt Research CMS.
 *
 *   npm run seed          — upsert (safe to re-run any number of times)
 *   npm run seed:reset    — truncate content tables first, then upsert
 *
 * Every upsertX() helper follows the same three-step shape:
 *   1. Look up an existing entry by a stable natural key (findFirst).
 *   2. update() if found, create() if not — matched by that key, never
 *      always-create.
 *   3. Explicitly publish({ documentId }) afterward — Strapi v5's
 *      Document Service create()/update() always produce/touch a DRAFT
 *      row; nothing is published until publish() is called separately.
 *
 * Uploaded media is matched and skipped by filename (uploadAsset()), so
 * re-running this script never duplicates media library entries, and a
 * missing asset file degrades to a logged warning + `null` media id
 * rather than a thrown error — every field below tolerates a null image.
 */

import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';

const RESET = process.argv.includes('--reset');
const ASSETS_DIR = path.join(__dirname, 'seed-assets', 'figma');

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

function mimeTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

/** Uploads are matched and skipped by filename — re-running this script
 * never duplicates media library entries. */
async function uploadAsset(strapi: any, filename: string): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;

  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    strapi.log.warn(`[seed] Asset "${filename}" not found in scripts/seed-assets/figma — skipping upload`);
    return null;
  }

  const stats = fs.statSync(filePath);
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: {},
    files: {
      path: filePath,
      name: filename,
      type: mimeTypeFor(filename),
      size: stats.size,
    },
  });

  return uploaded?.id ?? null;
}

// ---------------------------------------------------------------------------
// Generic upsert helpers
// ---------------------------------------------------------------------------

async function upsertBySlug(strapi: any, uid: string, slug: string, data: Record<string, unknown>) {
  const existing = await strapi.documents(uid).findFirst({ filters: { slug } });
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  return doc;
}

// ---------------------------------------------------------------------------
// 1. Testimonials — natural key { authorName, company } (no slug field)
// ---------------------------------------------------------------------------

const TESTIMONIALS = [
  { quote: 'This platform cut our time-to-launch in half.', authorName: 'Ade Coker', authorRole: 'Head of Product', company: 'Northwind', rating: 5, featured: true },
  { quote: 'Editors ship copy changes without touching a pull request.', authorName: 'Priya Shah', authorRole: 'Marketing Lead', company: 'Fenwick', rating: 5, featured: true },
  { quote: 'The dynamic zone model is the best content architecture we have used.', authorName: 'Tom Reyes', authorRole: 'CTO', company: 'Loft & Co', rating: 5, featured: true },
  { quote: 'Preview mode saved us from three bad launches.', authorName: 'Grace Lin', authorRole: 'PM', company: 'Backyard', rating: 4, featured: false },
  { quote: 'Revalidation is instant. No more waiting an hour to see a fix.', authorName: 'Marcus Webb', authorRole: 'Engineer', company: 'Fenwick', rating: 5, featured: false },
  { quote: 'Migrating from a monolith CMS took a weekend, not a quarter.', authorName: 'Elena Petrova', authorRole: 'VP Eng', company: 'Northwind', rating: 5, featured: false },
];

/**
 * Returns the PUBLISHED row's numeric ids (not the draft row's `id`).
 *
 * In Strapi v5's Document Service, one logical "document" is backed by
 * two separate DB rows — draft and published — each with its OWN
 * numeric `id`. create()/update() return the draft row. A relation
 * (e.g. a page's blocks.testimonials component) wired against the draft
 * id would resolve fine on a draft page fetch but silently resolve to
 * nothing once that page is fetched `status: 'published'` — populated
 * relations pointing at a row that only exists in the draft table are
 * dropped, not errored. The fix: re-read each entry with
 * `status: 'published'` after publish() and collect THAT row's id.
 */
async function upsertTestimonials(strapi: any): Promise<number[]> {
  const uid = 'api::testimonial.testimonial';
  const ids: number[] = [];

  for (const t of TESTIMONIALS) {
    const existing = await strapi.documents(uid).findFirst({
      filters: { authorName: t.authorName, company: t.company },
    });
    const doc = existing
      ? await strapi.documents(uid).update({ documentId: existing.documentId, data: t })
      : await strapi.documents(uid).create({ data: t });

    await strapi.documents(uid).publish({ documentId: doc.documentId });

    const published = await strapi.documents(uid).findOne({
      documentId: doc.documentId,
      status: 'published',
    });
    if (published?.id) ids.push(published.id);
  }

  // NOTE: these published ids are computed (and available) precisely to
  // demonstrate the draft/published id-mismatch fix above, but the
  // seeded home page's `blocks` array contains no `blocks.testimonials`
  // entry — see upsertHomePage() — so this return value is not
  // currently consumed downstream. Left wired for the next editor who
  // adds a testimonials block to a page.
  return ids;
}

// ---------------------------------------------------------------------------
// 2. Global — single type
// ---------------------------------------------------------------------------

async function upsertGlobal(strapi: any, logoId: number | null) {
  const uid = 'api::global.global';

  const data = {
    siteName: 'Unimrkt Research',
    logo: logoId,
    copyright: `Copyright © ${new Date().getFullYear()} Unimrkt Research All rights reserved.`,
    defaultSeo: {
      metaTitle: 'Unimrkt Research — Structured Market Data',
      metaDescription:
        'Unimrkt Research delivers reliable market intelligence, actionable insights, and data-driven strategies across 90+ countries and 22+ languages.',
    },
    primaryNav: [
      { label: 'About unimrkt', href: '/about', isExternal: false },
      {
        label: 'Services',
        href: '/services',
        isExternal: false,
        children: [
          { label: 'Web Development', href: '/services/web-development', isExternal: false },
          { label: 'UI/UX Design', href: '/services/ui-ux-design', isExternal: false },
          { label: 'Cloud & DevOps', href: '/services/cloud-devops', isExternal: false },
        ],
      },
      {
        label: 'Industries',
        href: '/#industries',
        isExternal: false,
        // "Industries"/"Services" point at homepage anchors rather than
        // dedicated routes — this Figma sync only covers the homepage;
        // a real Industries/Blog/Gallery section is a follow-up, not
        // invented here as fake standalone pages. Kept as a nav child so
        // the nested-route demo still proves a Page can resolve at a
        // nested path (see upsertNestedDemoPage()).
        children: [{ label: 'Nested route demo', href: '/about/cloud', isExternal: false }],
      },
      { label: 'Blogs', href: '/#blogs', isExternal: false },
      { label: 'gallery', href: '/#gallery', isExternal: false },
      { label: 'Contact', href: '/contact', isExternal: false },
    ],
    navCta: { label: 'Talk to Experts', href: '/contact', isExternal: false, variant: 'primary' },
    footerColumns: [
      {
        heading: 'Our Company',
        links: [
          { label: 'About Us', href: '/about', isExternal: false, variant: 'link' },
          { label: 'Contact Us', href: '/contact', isExternal: false, variant: 'link' },
          { label: 'Privacy Policy', href: '/privacy', isExternal: false, variant: 'link' },
          { label: 'Global Panel', href: '/#global-panel', isExternal: false, variant: 'link' },
          { label: 'Gallery', href: '/#gallery', isExternal: false, variant: 'link' },
        ],
      },
      {
        heading: 'Services',
        links: [
          { label: 'Primary Research', href: '/services', isExternal: false, variant: 'link' },
          { label: 'Qualitative Research', href: '/services', isExternal: false, variant: 'link' },
          { label: 'Quantitative Research', href: '/services', isExternal: false, variant: 'link' },
          { label: 'Business Research', href: '/services', isExternal: false, variant: 'link' },
          { label: 'Research Support Functions', href: '/services', isExternal: false, variant: 'link' },
        ],
      },
      {
        heading: 'Quick Links',
        links: [
          { label: 'Industries', href: '/#industries', isExternal: false, variant: 'link' },
          { label: 'Our Team', href: '/about', isExternal: false, variant: 'link' },
          { label: 'Careers', href: '/careers', isExternal: false, variant: 'link' },
          { label: 'Blogs', href: '/#blogs', isExternal: false, variant: 'link' },
          { label: 'Sitemap', href: '/sitemap', isExternal: false, variant: 'link' },
        ],
      },
    ],
    socialLinks: [
      { label: 'Facebook', href: 'https://facebook.com', isExternal: true, variant: 'link' },
      { label: 'X', href: 'https://x.com', isExternal: true, variant: 'link' },
      { label: 'LinkedIn', href: 'https://linkedin.com', isExternal: true, variant: 'link' },
      { label: 'Instagram', href: 'https://instagram.com', isExternal: true, variant: 'link' },
    ],
  };

  const existing = await strapi.documents(uid).findFirst({});
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  return doc;
}

// ---------------------------------------------------------------------------
// 3. Pages
// ---------------------------------------------------------------------------

async function upsertHomePage(strapi: any, images: Record<string, number | null>) {
  const data = {
    title: 'Home',
    seo: {
      metaTitle: 'Unimrkt Research — Structured Market Data',
      metaDescription:
        'Delivering structured market data enabling organizations to gain complete clarity into market dynamics, minimize risks, and uncover new opportunities.',
    },
    blocks: [
      {
        __component: 'blocks.hero',
        eyebrow: 'Market Intelligence',
        heading: 'Structured Market Data for Unprecedented Clarity',
        subheading:
          'Delivering structured market data enabling organizations to gain complete clarity into market dynamics, minimize risks, and uncover new opportunities.',
        media: images.heroPhoto,
        mediaAlignment: 'background',
        actions: [{ label: 'Discover the unimrkt', href: '/about', isExternal: false, variant: 'primary' }],
        sideMenu: [
          { label: 'Online Bulletin Board', href: '/services' },
          { label: 'Intercept Interview', href: '/services' },
          { label: 'Country Research', href: '/services' },
          { label: 'Competitive Intelligence', href: '/services' },
          { label: 'Survey Programming', href: '/services' },
          { label: 'In-Depth Interview', href: '/services' },
          { label: 'Telephonic Interview', href: '/services' },
        ],
        theme: 'dark',
      },
      {
        __component: 'blocks.hero',
        eyebrow: 'About Unimrkt',
        heading: 'Global Research, Local Understanding',
        subheading:
          'As a trusted market research company, we partner with forward-thinking organizations to deliver accurate insights, meaningful intelligence, and data-driven strategies that support informed decision-making, sustainable growth, and industry leadership.',
        media: images.momentsLarge,
        mediaAlignment: 'below',
        headingSize: 'h2',
        actions: [{ label: 'Get Started Today', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'light',
      },
      {
        __component: 'blocks.service-band',
        heading: 'Research Solutions That Drive Growth',
        body: 'Delivering end-to-end research solutions that transform data into confident business decisions, enabling organizations to uncover opportunities, understand markets, and drive sustainable growth.',
        background: images.servicesEarth,
        cta: { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' },
        items: [
          { label: 'Research Support', href: '/services' },
          { label: 'Qualitative Research', href: '/services' },
          { label: 'Quantitative Research', href: '/services' },
          { label: 'Business Research', href: '/services' },
        ],
      },
      {
        __component: 'blocks.stats-band',
        items: [
          { value: '250000+', label: 'Surveys Completed Annually' },
          // inferred label — not named on the Figma canvas; every other
          // figure ties directly to the "About Unimrkt" body copy above.
          { value: '450+', label: 'Global Clients' },
          { value: '16+ Years', label: 'Of Research Excellence' },
        ],
        theme: 'light',
      },
      {
        __component: 'blocks.hero',
        heading: '500+ Advanced CATI Workstations',
        subheading:
          'Equipped to deliver high-volume, accurate, and efficient telephone research nationwide, supported by advanced technology, skilled interviewers, and robust quality control processes.',
        media: images.momentsSmall,
        mediaAlignment: 'left',
        actions: [{ label: 'Get Started Today', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'light',
      },
      {
        __component: 'blocks.industry-grid',
        heading: 'Industries We Serve',
        subheading:
          'Helping organizations make smarter decisions through global research expertise and industry insights.',
        background: images.industryCityscape,
        cta: { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'primary' },
        // Every real card uses the same accent color — there is no
        // per-industry palette on the source canvas.
        items: [
          { title: 'Healthcare & Life Sciences', image: images.industryHealthcare, accentColor: '#7f3856' },
          { title: 'Banking & Financial Services', image: images.industryBanking, accentColor: '#7f3856' },
          { title: 'Retail & Consumer Goods', image: images.industryRetail, accentColor: '#7f3856' },
          { title: 'Automotive & Mobility', image: images.industryAutomotive, accentColor: '#7f3856' },
        ],
      },
      {
        __component: 'blocks.content',
        heading: 'Unlock the Power of Marketplaces',
        body: 'Unimrkt conducts multi-industry research across 90 countries in over 22 languages.',
        mediaAlignment: 'none',
        theme: 'light',
      },
      {
        __component: 'blocks.media-gallery',
        heading: 'Moments of Excellence',
        subheading:
          'Showcasing the expertise, innovation, and dedication behind every research project and client success story.',
        actions: [
          { label: 'Browse Gallery', href: '/#gallery', isExternal: false, variant: 'secondary' },
          { label: 'Browse Blogs', href: '/#blogs', isExternal: false, variant: 'secondary' },
        ],
        // The two `large` items show the play-button overlay purely from
        // `size` — no `videoUrl` here on purpose. No real embedded video
        // exists anywhere in the source assets; shipping a fabricated
        // videoUrl would be worse than no link at all.
        items: [
          { media: images.momentsLarge, size: 'large' },
          { media: images.momentsLarge, size: 'large' },
          { media: images.momentsSmall, size: 'small' },
          { media: images.momentsSmall, size: 'small' },
          { media: images.momentsSmall, size: 'small' },
          { media: images.momentsSmall, size: 'small' },
        ],
        theme: 'light',
      },
      {
        __component: 'blocks.blog-teaser',
        eyebrow: 'Latest Blogs',
        heading: 'Exploring Market Trends',
        posts: [
          {
            title: 'All You Need to Know About Online Market Research',
            excerpt:
              'In a world where consumer behavior evolves faster than a trending topic, online market research has become essential.',
            image: images.blogPhoto,
            href: '/#blogs',
          },
          {
            title: 'Why Field-Based Quantitative Market Research Remains Critical in 2026',
            excerpt: 'Over the past few years, the research landscape has shifted rapidly.',
            image: images.blogFieldResearch,
            href: '/#blogs',
          },
          {
            title: 'AI and the Workforce in 2026: Transformation, Disruption, or Both?',
            excerpt: 'In 2026, artificial intelligence is no longer an emerging tool.',
            image: images.blogAiWorkforce,
            href: '/#blogs',
          },
        ],
        theme: 'light',
      },
      {
        __component: 'blocks.faq',
        heading: 'Frequently Asked Questions',
        background: images.faqWorldmap,
        // The accordion is collapsed by default on the source canvas, so
        // no answer copy was ever visible to extract — every answer
        // below is authored, not pulled.
        items: [
          {
            question: 'What market research services does Unimrkt offer?',
            answer:
              'Our services span qualitative and quantitative research, CATI surveys, business research, global panel solutions, data analytics, and end-to-end research support.',
          },
          {
            question: 'What industries does Unimrkt serve?',
            answer:
              'We work across healthcare & life sciences, banking & financial services, retail & consumer goods, automotive & mobility, and more — see Industries We Serve above.',
          },
          {
            question: "What is Unimrkt's global research reach?",
            answer:
              'We operate across 90+ countries in over 22 languages, combining worldwide research capabilities with deep local expertise.',
          },
          {
            question: 'How does Unimrkt ensure data quality and reliability?',
            answer:
              'Every engagement runs through robust quality control processes, trained interviewers, and 500+ CATI workstations built for high-volume, accurate telephone research.',
          },
          {
            question: 'Why choose Unimrkt as your research partner?',
            answer:
              '16+ years of research excellence, 250,000+ surveys completed annually, and a track record of turning complex data into clear strategic direction.',
          },
        ],
        theme: 'light',
      },
      {
        __component: 'blocks.content',
        heading: 'Global Research, Local Understanding',
        body: 'At Unimrkt Research, we empower organizations with reliable market intelligence, actionable insights, and data-driven strategies that support confident decision-making. Since 2009, we have been helping businesses across industries uncover opportunities, understand consumer behavior, and navigate evolving market landscapes through comprehensive research solutions. With a strong global presence across 90+ countries and 22+ languages, we combine worldwide research capabilities with deep local expertise to deliver accurate, relevant, and impactful insights. Our services span qualitative and quantitative research, CATI surveys, business research, global panel solutions, data analytics, and end-to-end research support. Backed by 16+ years of research excellence, 500+ CATI workstations, and 250,000+ surveys completed annually, we are committed to delivering high-quality data and meaningful intelligence that drive growth, innovation, and business success.',
        mediaAlignment: 'none',
        theme: 'light',
      },
      {
        __component: 'blocks.cta',
        heading: 'Global Research Panel',
        body: 'Access a diverse network of verified respondents across multiple countries, demographics, and industries, enabling reliable market research, faster data collection, and meaningful insights at a global scale.',
        actions: [{ label: 'Explore Our Global Panel', href: '/#global-panel', isExternal: false, variant: 'primary' }],
        background: images.momentsLarge,
        theme: 'dark',
      },
    ],
  };

  return upsertBySlug(strapi, 'api::page.page', 'home', data);
}

async function upsertAboutPage(strapi: any) {
  const data = {
    title: 'About',
    seo: {
      metaTitle: 'About — UniMarket',
      metaDescription:
        'UniMarket is built by a small team who got tired of redeploying a marketing site for every copy change.',
    },
    blocks: [
      {
        __component: 'blocks.hero',
        eyebrow: 'Our story',
        heading: 'A CMS engine, not a homepage',
        subheading: 'Every page on this site — including this one — is a Strapi entry, not a route.',
        mediaAlignment: 'below',
        actions: [{ label: 'Back to home', href: '/', isExternal: false, variant: 'secondary' }],
        theme: 'light',
      },
      {
        __component: 'blocks.cta',
        heading: 'Want to see it in Strapi?',
        body: 'Open Content Manager -> Page -> About to edit this exact block list.',
        actions: [{ label: 'Get started', href: '/signup', isExternal: false, variant: 'primary' }],
        theme: 'accent',
      },
    ],
  };

  return upsertBySlug(strapi, 'api::page.page', 'about', data);
}

/**
 * Reachable at /about/cloud via the generic catch-all route (resolved by
 * its final URL segment, "cloud") — proves a flat `uid` slug can still
 * back a nested-looking URL. This used to live at /services/cloud, but
 * that URL prefix is now permanently shadowed by the dedicated
 * app/services/[slug] route — an accepted, disclosed trade-off, not a
 * bug — so the demo moved under /about instead.
 */
async function upsertNestedDemoPage(strapi: any) {
  const data = {
    title: 'Cloud Services',
    seo: {
      metaTitle: 'Cloud Services — UniMarket',
      metaDescription: 'Reachable at /about/cloud — resolved by its slug "cloud", not its full URL.',
    },
    blocks: [
      {
        __component: 'blocks.hero',
        eyebrow: 'Nested route demo',
        heading: 'This page lives at /about/cloud',
        subheading: 'Its Strapi slug is just "cloud" — the catch-all route resolves by the final URL segment.',
        mediaAlignment: 'below',
        actions: [],
        theme: 'dark',
      },
    ],
  };

  return upsertBySlug(strapi, 'api::page.page', 'cloud', data);
}

// ---------------------------------------------------------------------------
// 4. Services
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    title: 'Professional Web Development Services',
    slug: 'web-development',
    summary: 'Scalable and custom web applications for your enterprise.',
    basePrice: '₹40,000',
    seo: {
      metaTitle: 'Web Development — UniMarket',
      metaDescription: 'Custom storefronts and marketing sites built on a decoupled Strapi + Next.js MVC engine.',
    },
    features: [
      { title: 'Server-rendered by default', description: 'Every route is a React Server Component — no client-side waterfall for first paint.' },
      { title: 'ISR out of the box', description: 'Published content revalidates on a webhook, not a redeploy.' },
      { title: 'Typed end to end', description: 'Strapi schema to normalized domain model to View props, no `any` at the boundary.' },
    ],
    blocks: [
      {
        __component: 'blocks.hero',
        eyebrow: 'Service',
        heading: 'Web development that ships without a deploy',
        subheading: 'We build the engine; your team edits the content.',
        mediaAlignment: 'right',
        actions: [{ label: 'Get a quote', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'light',
      },
      {
        __component: 'blocks.content',
        heading: 'What you get',
        body: 'A production Next.js app wired to a Strapi content model your editors already understand — pages, navigation, and reusable sections, all typed from the database to the browser.',
        mediaAlignment: 'none',
        theme: 'light',
      },
      {
        __component: 'blocks.cta',
        heading: 'Ready to start your build?',
        body: 'Most engagements start with a two-week content-model workshop.',
        actions: [{ label: 'Book a call', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'accent',
      },
    ],
  },
  {
    title: 'UI/UX Design',
    slug: 'ui-ux-design',
    summary: 'Interface and interaction design for teams who need a design system, not just a mockup.',
    basePrice: 'From $1,800',
    seo: {
      metaTitle: 'UI/UX Design — UniMarket',
      metaDescription: 'Interface and interaction design built around a reusable design system, not one-off mockups.',
    },
    features: [
      { title: 'Design tokens first', description: 'Palette, type scale, spacing and radius defined once, consumed everywhere.' },
      { title: 'Component-driven', description: 'Every screen is composed from the same atoms your engineers will actually ship.' },
      { title: 'Accessible by default', description: 'Contrast, focus states and semantic markup are part of the deliverable, not a follow-up.' },
    ],
    blocks: [
      {
        __component: 'blocks.hero',
        eyebrow: 'Service',
        heading: 'Design systems your engineers will actually use',
        subheading: 'Every screen maps directly onto a real, typed component.',
        mediaAlignment: 'right',
        actions: [{ label: 'See our process', href: '/about', isExternal: false, variant: 'primary' }],
        theme: 'light',
      },
      {
        __component: 'blocks.content',
        heading: 'How we work',
        body: 'We design in the same token structure your codebase already uses, so nothing gets "translated" between Figma and production — it ships as-is.',
        mediaAlignment: 'none',
        theme: 'light',
      },
      {
        __component: 'blocks.cta',
        heading: 'Want a design system audit?',
        body: 'We review your existing components before proposing anything new.',
        actions: [{ label: 'Book a call', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'accent',
      },
    ],
  },
  {
    title: 'Cloud & DevOps',
    slug: 'cloud-devops',
    summary: 'Infrastructure, CI/CD and on-call support for the Strapi + Next.js stack you already run.',
    basePrice: 'From $3,200/mo',
    seo: {
      metaTitle: 'Cloud & DevOps — UniMarket',
      metaDescription: 'Infrastructure, CI/CD and on-call support tuned for a Strapi + Next.js content engine.',
    },
    features: [
      { title: 'ISR-aware caching', description: 'CDN and revalidation tuned around your actual publish cadence, not a generic TTL.' },
      { title: 'Zero-downtime deploys', description: 'Backend schema changes roll out without taking the storefront offline.' },
      { title: '24/7 on-call', description: 'A real person, not a ticket queue, for anything that pages you at 3am.' },
    ],
    blocks: [
      {
        __component: 'blocks.hero',
        eyebrow: 'Service',
        heading: 'Infrastructure that matches how you actually publish',
        subheading: 'Caching, CI/CD and on-call, tuned for a CMS-driven storefront.',
        mediaAlignment: 'right',
        actions: [{ label: 'Talk to us', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'light',
      },
      {
        __component: 'blocks.content',
        heading: 'What we manage',
        body: 'Strapi hosting, the revalidation webhook, CDN cache rules, and the CI pipeline that builds and deploys both apps — so a schema change never means a 2am incident.',
        mediaAlignment: 'none',
        theme: 'light',
      },
      {
        __component: 'blocks.cta',
        heading: 'Already running Strapi + Next.js?',
        body: 'We can take over ops without a migration.',
        actions: [{ label: 'Book a call', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'accent',
      },
    ],
  },
];

async function upsertServices(strapi: any) {
  for (const service of SERVICES) {
    // eslint-disable-next-line no-await-in-loop -- each service must fully commit before the next, for readable seed logs
    await upsertBySlug(strapi, 'api::service.service', service.slug, service);
  }
}

// ---------------------------------------------------------------------------
// 5. Cities
// ---------------------------------------------------------------------------

const CITIES = [
  { name: 'Rewari', slug: 'rewari', region: 'Haryana' },
  { name: 'Gurugram', slug: 'gurugram', region: 'Haryana' },
  { name: 'Delhi', slug: 'delhi', region: 'Delhi NCR' },
  { name: 'Noida', slug: 'noida', region: 'Uttar Pradesh' },
  { name: 'Jaipur', slug: 'jaipur', region: 'Rajasthan' },
];

async function upsertCities(strapi: any) {
  for (const city of CITIES) {
    // eslint-disable-next-line no-await-in-loop
    await upsertBySlug(strapi, 'api::city.city', city.slug, city);
  }
}

// ---------------------------------------------------------------------------
// 6. City-service overrides — natural key { city.slug, service.slug }
//
// Only `web-development` is overridden, and only for 3 of the 5 cities.
// `noida` and `jaipur` deliberately get no override row for any service,
// to prove a (city, service) pair with no override renders 100% from
// the master `service` entry.
// ---------------------------------------------------------------------------

const CITY_SERVICE_OVERRIDES = [
  {
    citySlug: 'rewari',
    serviceSlug: 'web-development',
    overrideTitle: 'Web Development Services in Rewari',
    // Explicitly nulled (not omitted) — proves the master/override merge
    // falls back per-field, not per-row: an override row can exist and
    // still defer specific fields to the master service.
    overrideSummary: null,
    customPrice: '₹45,000',
    localAddress: 'Model Town, Rewari, Haryana',
    localPhone: null,
  },
  {
    citySlug: 'delhi',
    serviceSlug: 'web-development',
    overrideTitle: 'Premier Web Development Agency in Delhi NCR',
    overrideSummary: 'High-performance websites and portals tailored for businesses in Delhi.',
    customPrice: '₹65,000',
    localAddress: 'Connaught Place, New Delhi',
    localPhone: '+91 11 4000 0000',
  },
  {
    citySlug: 'gurugram',
    serviceSlug: 'web-development',
    overrideTitle: 'Enterprise Web & Tech Solutions in Gurugram',
    overrideSummary: 'Modern Next.js web applications built for startups and scale-ups in Cyber City.',
    customPrice: '₹80,000',
    localAddress: 'Cyber City, DLF Phase 2, Gurugram',
    localPhone: '+91 124 5000 0000',
  },
];

async function upsertCityServiceOverride(
  strapi: any,
  { citySlug, serviceSlug, ...fields }: (typeof CITY_SERVICE_OVERRIDES)[number]
) {
  const uid = 'api::city-service-override.city-service-override';

  const city = await strapi.documents('api::city.city').findFirst({ filters: { slug: citySlug } });
  const service = await strapi.documents('api::service.service').findFirst({ filters: { slug: serviceSlug } });

  if (!city || !service) {
    strapi.log.warn(
      `[seed] Skipping city-service-override: "${citySlug}"/"${serviceSlug}" not found yet`
    );
    return null;
  }

  const data = { ...fields, city: city.documentId, service: service.documentId };

  const existing = await strapi.documents(uid).findFirst({
    filters: { city: { slug: citySlug }, service: { slug: serviceSlug } },
  });
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  return doc;
}

async function upsertCityServiceOverrides(strapi: any) {
  for (const override of CITY_SERVICE_OVERRIDES) {
    // eslint-disable-next-line no-await-in-loop
    await upsertCityServiceOverride(strapi, override);
  }
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Deletion order matters: testimonials and pages first (nothing depends
 * on them being present), then services, then overrides (which reference
 * both city and service — deleted before either so no dangling FK at
 * delete time), then city, then global last. Uploaded media files are
 * NOT deleted — uploadAsset() re-matches by filename and skips
 * re-uploading regardless.
 */
async function resetContent(strapi: any) {
  strapi.log.info('[seed] --reset: truncating content tables');
  await strapi.db.query('api::testimonial.testimonial').deleteMany({});
  await strapi.db.query('api::page.page').deleteMany({});
  await strapi.db.query('api::service.service').deleteMany({});
  await strapi.db.query('api::city-service-override.city-service-override').deleteMany({});
  await strapi.db.query('api::city.city').deleteMany({});
  await strapi.db.query('api::global.global').deleteMany({});
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

const IMAGE_FILENAMES = {
  heroPhoto: 'hero-photo.png',
  momentsLarge: 'moments-large.png',
  momentsSmall: 'moments-small.png',
  servicesEarth: 'services-earth.png',
  industryHealthcare: 'industry-healthcare.png',
  industryBanking: 'industry-banking.png',
  industryRetail: 'industry-retail.png',
  industryAutomotive: 'industry-automotive.png',
  industryCityscape: 'industry-cityscape.png',
  faqWorldmap: 'faq-worldmap-bg.png',
  blogPhoto: 'blog-photo.png',
  blogFieldResearch: 'blog-field-research.png',
  blogAiWorkforce: 'blog-ai-workforce.png',
} as const;

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'info';

  try {
    if (RESET) {
      await resetContent(app);
    }

    // 1. Testimonials first — their published numeric ids must exist
    //    before anything that could relate to them is created.
    await upsertTestimonials(app);

    // 2. Media uploads next — every page/service that references an
    //    image needs the uploaded file's id already resolved.
    const logoId = await uploadAsset(app, 'logo-nav.png');
    const images: Record<string, number | null> = {};
    for (const [key, filename] of Object.entries(IMAGE_FILENAMES)) {
      // eslint-disable-next-line no-await-in-loop
      images[key] = await uploadAsset(app, filename);
    }

    // 3. Global — site-wide shell, conceptually ahead of content pages.
    await upsertGlobal(app, logoId);

    // 4. Pages.
    await upsertHomePage(app, images);
    await upsertAboutPage(app);
    await upsertNestedDemoPage(app);

    // 5. Services — must exist before overrides (required relation).
    await upsertServices(app);

    // 6. Cities — must exist before overrides (required relation).
    await upsertCities(app);

    // 7. City-service overrides last.
    await upsertCityServiceOverrides(app);

    app.log.info('[seed] Done.');
  } finally {
    await app.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
