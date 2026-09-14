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
      // This Strapi version's upload service is built against
      // formidable v3's File shape — it reads `file.filepath` (not
      // `.path`), `file.originalFilename` (not `.name`, defaulting to
      // the literal string "unamed" when absent), and `file.mimetype`
      // (not `.type`, defaulting to a guessed `.bin` extension when
      // absent). All four names are set here so this keeps working
      // across Strapi versions that read either convention.
      path: filePath,
      filepath: filePath,
      name: filename,
      originalFilename: filename,
      type: mimeTypeFor(filename),
      mimetype: mimeTypeFor(filename),
      size: stats.size,
    },
  });

  return uploaded?.id ?? null;
}

// ---------------------------------------------------------------------------
// Generic upsert helpers
// ---------------------------------------------------------------------------

async function upsertBySlug(
  strapi: any,
  uid: string,
  slug: string,
  data: Record<string, unknown>,
  publish: boolean = true
) {
  const existing = await strapi.documents(uid).findFirst({ filters: { slug } });
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  // Default true so every existing call site (none of which pass a 5th
  // arg) keeps its current always-publish behavior unchanged. Only the
  // Google Sheet IA migration's "Content Created" column needs draft rows.
  if (publish) {
    await strapi.documents(uid).publish({ documentId: doc.documentId });
  }
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
    footerTagline:
      'Delivering global market research, data collection, and actionable insights that drive smarter business decisions.',
    defaultSeo: {
      metaTitle: 'Unimrkt Research — Structured Market Data',
      metaDescription:
        'Unimrkt Research delivers reliable market intelligence, actionable insights, and data-driven strategies across 90+ countries and 22+ languages.',
    },
    primaryNav: [
      // Figma shows a dropdown chevron on this item too, but there's no
      // real sub-navigation content for it (no second About-adjacent
      // page beyond /about itself) — `showIndicator` renders the chevron
      // for visual parity without a fake dropdown menu behind it.
      { label: 'About unimrkt', href: '/about', isExternal: false, showIndicator: true },
      {
        label: 'Services',
        href: '/services',
        isExternal: false,
        // Empty on purpose — the frontend's Services dropdown is
        // live-fetched from the real category hierarchy (getServiceTree(),
        // merged in app/layout.tsx) and overrides this at render time.
        // This only matters as the fallback if that fetch fails, and an
        // empty dropdown is more honest than relinking the 3 demo services
        // (web-development/ui-ux-design/cloud-devops) that were removed.
        children: [],
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
      { label: 'Contact', href: '/contact', isExternal: false, showIndicator: true },
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
    // `slug` (a `uid` field, `targetField: 'title'`) must be set explicitly
    // here: that auto-generate-from-title behavior is a content-manager
    // (admin UI) convenience, not something strapi.documents().create()
    // does on its own — omitting it leaves `slug: null`, which fails the
    // field's `required` schema validation.
    slug: 'home',
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
          { label: 'Competitive Intelligence', href: '/services', isActive: true },
          { label: 'Survey programming', href: '/services' },
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
        // Figma node 267:1487 ("Group 1597879952") — a stat callout
        // beside the subheading/CTA row, below the banner image.
        statValue: '16',
        statLabel: '+ years of work experience',
        actions: [{ label: 'Get Started Today', href: '/contact', isExternal: false, variant: 'primary' }],
        theme: 'light',
      },
      {
        __component: 'blocks.service-band',
        heading: 'Research Solutions That Drive Growth',
        body: 'Delivering end-to-end research solutions that transform data into confident business decisions, enabling organizations to uncover opportunities, understand markets, and drive sustainable growth.',
        background: images.servicesEarth,
        cta: { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' },
        // `description` is authored editorial copy (not extracted — the
        // Figma canvas only shows these as collapsed pill labels with no
        // visible expanded/description state), added for the hover-expand
        // card interaction.
        items: [
          {
            label: 'Research Support',
            href: '/services',
            description: 'Dedicated project management and fieldwork operations that keep every study on schedule and on spec.',
          },
          {
            label: 'Qualitative Research',
            href: '/services',
            description: 'In-depth interviews and focus groups that surface the "why" behind consumer behavior.',
          },
          {
            label: 'Quantitative Research',
            href: '/services',
            description: 'Statistically robust surveys at scale, built for confident, data-driven decisions.',
          },
          {
            label: 'Business Research',
            href: '/services',
            description: 'Market sizing, competitive intelligence, and feasibility studies for strategic planning.',
          },
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
        // Figma node 268:5555 ("Component 179") — the world map + 4
        // marker-pin illustration, previously a disclosed gap (rendered
        // as plain text with no map). Exported as one flattened image
        // (map + pins already composited by Figma) rather than
        // hand-recreating the pin geometry.
        __component: 'blocks.content',
        heading: 'Unlock the Power of Marketplaces',
        body: 'Unimrkt conducts multi-industry research across 90 countries in over 22 languages.',
        media: images.worldmapMarketplaces,
        mediaAlignment: 'below',
        contactPrompt: 'To know more about our global coverage, please email us at',
        contactEmail: 'sales@unimrkt.com',
        theme: 'light',
      },
      {
        __component: 'blocks.media-gallery',
        heading: 'Moments of Excellence',
        subheading:
          'Showcasing the expertise, innovation, and dedication behind every research project and client success story.',
        actions: [{ label: 'Browse Gallery', href: '/#gallery', isExternal: false, variant: 'secondary' }],
        // The two `large` items show the play-button overlay purely from
        // `size` — no `videoUrl` here on purpose. No real embedded video
        // exists anywhere in the source assets; shipping a fabricated
        // videoUrl would be worse than no link at all.
        items: [
          { media: images.galleryLarge1, size: 'large' },
          { media: images.galleryLarge2, size: 'large' },
          { media: images.gallerySmall1, size: 'small' },
          { media: images.gallerySmall2, size: 'small' },
          { media: images.gallerySmall3, size: 'small' },
          { media: images.gallerySmall4, size: 'small' },
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
            // /#blogs was a placeholder anchor before /blogs existed as a
            // real page (built earlier this session) — now a dead anchor,
            // so these 3 posts link to the real page instead.
            href: '/blogs',
          },
          {
            title: 'Why Field-Based Quantitative Market Research Remains Critical in 2026',
            excerpt: 'Over the past few years, the research landscape has shifted rapidly.',
            image: images.blogFieldResearch,
            href: '/blogs',
          },
          {
            title: 'AI and the Workforce in 2026: Transformation, Disruption, or Both?',
            excerpt: 'In 2026, artificial intelligence is no longer an emerging tool.',
            image: images.blogAiWorkforce,
            href: '/blogs',
          },
        ],
        theme: 'light',
      },
      {
        __component: 'blocks.faq',
        heading: 'Frequently Asked Questions',
        background: images.faqWorldmap,
        // Figma node 267:1274 — a standalone "Browse Blogs" gradient
        // button directly above this heading (confirmed by y-coordinate;
        // it does NOT belong to the media-gallery block above, despite
        // both actions previously being grouped there).
        cta: { label: 'Browse Blogs', href: '/blogs', isExternal: false, variant: 'primary' },
        // The accordion is collapsed by default on the source canvas, so
        // no answer copy was ever visible to extract — every answer
        // below is authored, not pulled. The 2 questions confirmed
        // against the actual Figma instances (267:1242/1243) match
        // verbatim; the remaining 3 are authored the same way.
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
        // Custom solid navy for this one CTA — the `theme: 'dark'` preset
        // above (bg-ink-900) is shared by every other dark section
        // site-wide, so this overrides just this instance's background.
        backgroundColor: '#0B132B',
      },
    ],
  };

  return upsertBySlug(strapi, 'api::page.page', 'home', data);
}

async function upsertAboutPage(strapi: any) {
  const data = {
    title: 'About',
    slug: 'about',
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
    slug: 'cloud',
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
// 4. Services — the 3 original demo entries (web-development/ui-ux-design/
// cloud-devops) that used to seed here, and their 3 city-service-override
// rows in section 6 below, were both removed on request once the real
// Google Sheet-migrated hierarchy (4b, below) became the site's only
// active Services content. Removed from this file so a `seed:reset` +
// `seed` cycle can't silently recreate them; the corresponding staging
// database rows were deleted directly via the Document Service, not left
// to a truncate-and-reseed. See git history for the original SERVICES
// array/upsertServices()/CITY_SERVICE_OVERRIDES/
// upsertCityServiceOverride(s)() code if the demo city+service combo
// feature is ever needed again.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 4b. Service category hierarchy — real business IA, migrated from the
// legacy site (Google Sheet 18XEame5GtnBZM1xG5zT91xtg_57hQtlsS4EQYiqupV8).
// Now the only content in the `service` collection — the 3 demo entries
// this used to coexist alongside (web-development/ui-ux-design/
// cloud-devops) were removed; see the comment above section 4.
//
// Every entry below is fully content-enriched (summary, 5 structured
// blocks, full SEO) and PUBLISHED — a later content-team edit through the
// admin panel is expected, but nothing here ships as a bare placeholder.
// ---------------------------------------------------------------------------

/** A single stat-band item as a compact [value, label] tuple — reduces
 * this file's already-large content payload without losing information. */
type StatTuple = [value: string, label: string];

/** Shared content-enrichment shape, reused by services/industries. Each
 * field maps to one of the 5 required blocks (see buildResearchBlocks()). */
interface ResearchContent {
  summary: string;
  overview: string;
  stats: StatTuple[];
  useCases: string;
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  methodology: string;
  metaDescription: string;
  keywords: string;
}

/** Builds the 5 required blocks (content, stats-band, content, cta,
 * content) from a ResearchContent payload — one place that defines the
 * block shape/order, so every seeded entry stays structurally identical. */
function buildResearchBlocks(title: string, c: ResearchContent) {
  return [
    {
      __component: 'blocks.content',
      heading: 'Overview',
      body: c.overview,
      mediaAlignment: 'none',
      theme: 'light',
    },
    {
      __component: 'blocks.stats-band',
      heading: `${title} by the numbers`,
      items: c.stats.map(([value, label]) => ({ value, label })),
      theme: 'light',
    },
    {
      __component: 'blocks.content',
      heading: 'Where this makes a difference',
      body: c.useCases,
      mediaAlignment: 'none',
      theme: 'light',
    },
    {
      __component: 'blocks.cta',
      heading: c.ctaHeading,
      body: c.ctaBody,
      actions: [{ label: c.ctaLabel, href: '/contact', isExternal: false, variant: 'primary' }],
      theme: 'accent',
    },
    {
      __component: 'blocks.content',
      heading: 'Methodology',
      body: c.methodology,
      mediaAlignment: 'none',
      theme: 'light',
    },
  ];
}

/** Builds the required `shared.seo` component from a ResearchContent
 * payload — metaTitle derived from title (kept under the 60-char limit),
 * metaDescription/keywords taken verbatim from the content payload. */
function buildResearchSeo(title: string, c: ResearchContent) {
  const suffix = ' | Unimrkt Research';
  const maxTitleLen = 60 - suffix.length;
  const metaTitle = title.length > maxTitleLen ? `${title.slice(0, maxTitleLen - 1)}…` : title;
  return {
    metaTitle: `${metaTitle}${suffix}`,
    metaDescription: c.metaDescription,
    keywords: c.keywords,
  };
}

/**
 * The full Figma node-474:5731 ("Primary Research") detail-page content,
 * mirroring `IndustryDetailSeed` (below, industries section) exactly —
 * same shape conventions (`DetailLinkSeed`/`DetailCardSeed`, media as
 * filenames resolved by `resolveServiceDetailSeed`). Only "Primary
 * Research" uses this; every other service stays base-fields-only, same
 * "missing data -> template fallback" rule the frontend enforces.
 */
interface ServiceCapabilitySeed {
  title: string;
  imageFilename: string;
}

interface ServiceStatSeed {
  value: string;
  label: string;
  iconIdentifier: string;
}

interface ServiceDetailSeed {
  heroEyebrow: string;
  heroHeading: string;
  heroSubheading: string;
  heroImageFilename: string;
  heroActions: DetailLinkSeed[];
  trustHeading: string;
  trustLogos: { name: string; imageFilename?: string }[];
  overviewEyebrow: string;
  overviewHeading: string;
  overviewBody: string;
  overviewImageFilename: string;
  overviewFeatures: DetailCardSeed[];
  capabilitiesEyebrow: string;
  capabilitiesHeading: string;
  capabilitiesBody: string;
  capabilities: ServiceCapabilitySeed[];
  credentialsHeading: string;
  credentialsBody: string;
  credentials: ServiceStatSeed[];
  methodologiesEyebrow: string;
  methodologiesHeading: string;
  methodologies: DetailCardSeed[];
  industriesEyebrow: string;
  industriesHeading: string;
  industriesBody: string;
  industriesServed: DetailCardSeed[];
  enquiryEyebrow: string;
  enquiryHeading: string;
  enquiryBody: string;
  enquiryImageFilename: string;
  faqItems: { question: string; answer: string }[];
  aboutEyebrow: string;
  aboutHeading: string;
  aboutBody: string;
}

/**
 * Every string below is copied verbatim from Figma node 474:5731 — the
 * FAQ answers and the 4 methodology-card descriptions are the disclosed
 * exceptions (Figma's own mockup copy-pastes one description under all
 * 4 methodology cards — visibly wrong, since it mentions "manufacturers"
 * under "Understand Objectives" — so distinct, sensible descriptions are
 * authored here instead of reproducing that artifact). Images reuse the
 * files already downloaded from this node into
 * scripts/seed-assets/figma/; the enquiry-band background reuses the
 * exact file already downloaded for /industries/[slug]'s equivalent
 * section (`enquiry-bg.jpg`) — same Figma image, no re-download.
 */
const PRIMARY_RESEARCH_DETAIL: ServiceDetailSeed = {
  heroEyebrow: 'PRIMARY RESEARCH',
  heroHeading: 'Real Conversations. Reliable Data. Better Decisions.',
  heroSubheading:
    'Collect first-hand market intelligence through customized primary research solutions that uncover customer opinions, validate business decisions, and fuel strategic growth.',
  heroImageFilename: 'primary-research-hero.jpg',
  heroActions: [
    { label: 'Get a Free Quote', href: '/contact', isExternal: false, variant: 'primary' },
    { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' },
  ],
  trustHeading: 'Trusted by Global Businesses',
  trustLogos: [], // Figma shows real company wordmarks as example imagery — not confirmed Unimrkt clients, left empty per instruction (same as /industries/[slug]).
  overviewEyebrow: 'About Primary Research',
  overviewHeading: 'First-Hand Insights That Power Better Business Decisions',
  overviewBody:
    'Primary research enables organizations to collect reliable information directly from customers, businesses, and stakeholders. At Unimrkt Research, we design customized research programs using qualitative and quantitative methodologies to help businesses understand markets, validate ideas, measure customer experience, and uncover new opportunities. Our experienced research professionals combine global reach, advanced technology, and proven methodologies to deliver accurate, high-quality data tailored to every project.',
  overviewImageFilename: 'primary-research-overview.jpg',
  overviewFeatures: [
    { title: 'Customized Research Solutions', iconIdentifier: 'shield-tick' },
    { title: 'Experienced Research Team', iconIdentifier: 'profile-2user' },
    { title: 'Accurate & Reliable Insights', iconIdentifier: 'medal-star' },
  ],
  capabilitiesEyebrow: 'Research',
  capabilitiesHeading: 'Our Primary Research Services',
  capabilitiesBody:
    'Explore our comprehensive primary research solutions, designed to collect accurate, first-hand data through proven methodologies, helping businesses gain actionable insights, understand markets, and make informed decisions.',
  capabilities: [
    { title: 'Telephonic Surveys', imageFilename: 'capability-telephonic-surveys.jpg' },
    { title: 'Online Surveys', imageFilename: 'capability-online-surveys.jpg' },
    { title: 'Focus Group Discussions', imageFilename: 'capability-focus-group-discussions.jpg' },
    { title: 'CATI Surveys', imageFilename: 'capability-cati-surveys.jpg' },
  ],
  credentialsHeading: 'Why Unimrkt Research?',
  credentialsBody:
    'Delivering accurate first-hand data through expert researchers, global reach, proven methodologies, and quality-driven processes, helping businesses make confident decisions and achieve sustainable growth.',
  credentials: [
    { value: '450+', label: 'CATI stations team members', iconIdentifier: 'profile-2user' },
    { value: 'On-time', label: 'project deliveries', iconIdentifier: 'clock' },
    { value: '80%', label: 'Repeat business', iconIdentifier: 'clipboard-tick' },
    { value: '250,000+ CATI', label: 'surveys completed every year', iconIdentifier: 'note' },
    { value: 'State-of-the-art', label: 'CATI systems integrated with predictive dialers', iconIdentifier: 'call' },
    { value: '35-40%', label: 'Average cost savings', iconIdentifier: 'rupee' },
    { value: '300+', label: 'moderators with rich professional background', iconIdentifier: 'shield-tick' },
    { value: 'ISO20252', label: '& ISO27001 certified', iconIdentifier: 'medal-star' },
    { value: '1000+', label: 'projects of combined experience, with 100% QA audits', iconIdentifier: 'archive-book' },
    { value: '30,000 sq. ft.', label: 'with the scalability of more than 450 seats', iconIdentifier: 'people' },
    { value: '24*7', label: 'support with access to dedicated analysts', iconIdentifier: 'headphone' },
    { value: 'ESOMAR', label: 'norms followed', iconIdentifier: 'user-tag' },
    { value: '90 countries', label: '& over 22+ foreign languages for multi-industry research', iconIdentifier: 'global' },
    { value: 'GDPR', label: 'compliant', iconIdentifier: 'security-user' },
    { value: '16+', label: 'years of experience', iconIdentifier: 'star' },
  ],
  methodologiesEyebrow: 'Process',
  methodologiesHeading: 'Research Methodologies',
  methodologies: [
    { title: 'Understand Objectives', description: 'We start by clarifying your research questions and business goals so every methodology decision that follows is grounded in what you actually need to learn.' },
    { title: 'Research Design', description: 'We select and design the right mix of qualitative and quantitative methods, sample structure, and timeline for your specific objectives.' },
    { title: 'Questionnaire Development', description: 'We script and pilot-test every questionnaire to make sure it captures clean, unambiguous data before fieldwork begins.' },
    { title: 'Respondent Recruitment', description: 'We recruit and screen respondents against your target criteria, drawing on global panels and our own interviewer network.' },
  ],
  industriesEyebrow: 'Our Industries',
  industriesHeading: 'Industries We Support',
  industriesBody:
    'Delivering tailored primary research solutions across diverse industries, helping businesses understand markets, uncover opportunities, and make confident, data-driven decisions with accurate insights.',
  industriesServed: [
    { title: 'Automotive', iconIdentifier: 'car' },
    { title: 'Healthcare', iconIdentifier: 'heart-pulse' },
    { title: 'BFSI', iconIdentifier: 'landmark' },
    { title: 'Retail', iconIdentifier: 'shopping-bag' },
    { title: 'Technology', iconIdentifier: 'cpu' },
    { title: 'Manufacturing', iconIdentifier: 'factory' },
    { title: 'Energy', iconIdentifier: 'flash' },
    { title: 'FMCG', iconIdentifier: 'shopping-cart' },
    { title: 'Telecom', iconIdentifier: 'radio' },
    { title: '& More', iconIdentifier: 'more' },
  ],
  enquiryEyebrow: 'Get a Free Quote!',
  enquiryHeading: "Let's Discuss Your Research Needs",
  enquiryBody:
    'Connect with our research experts to design customized solutions that deliver accurate insights, support informed decisions, and drive measurable business growth across your target markets.',
  enquiryImageFilename: 'enquiry-bg.jpg',
  faqItems: [
    {
      question: 'What is primary market research?',
      answer:
        'Primary market research is the process of collecting first-hand data directly from customers, businesses, or stakeholders — through surveys, interviews, or discussions — rather than relying on existing published sources.',
    },
    {
      question: 'What primary research services does Unimrkt Research offer?',
      answer:
        'We offer telephonic surveys, online surveys, focus group discussions, CATI surveys, and other custom fieldwork methods, tailored to your research objectives.',
    },
    {
      question: 'Which industries does Unimrkt Research serve?',
      answer:
        'We work across automotive, healthcare, BFSI, retail, technology, manufacturing, energy, FMCG, telecom, and many other sectors.',
    },
    {
      question: 'Can Unimrkt Research conduct international market research?',
      answer:
        'Yes — our research capabilities span 90+ countries and 22+ languages, combining global reach with local research expertise.',
    },
    {
      question: 'How does Unimrkt Research ensure data quality?',
      answer:
        'Every engagement runs through structured quality control — trained interviewers, live monitoring, validation callbacks, and audited datasets — backed by ISO 20252 and ISO 27001 certified processes.',
    },
    {
      question: 'Why should businesses choose Unimrkt Research?',
      answer:
        '16+ years of research excellence, 450+ CATI workstations, 250,000+ surveys completed annually, and a track record of turning first-hand data into confident business decisions.',
    },
    {
      question: 'How can I get started with Unimrkt Research?',
      answer:
        'Reach out via our enquiry form or Talk to Our Experts, and a research specialist will help scope your study and next steps.',
    },
  ],
  aboutEyebrow: 'About Primary Research',
  aboutHeading: 'Unlock Reliable Insights with Expert Primary Research',
  aboutBody:
    'At Unimrkt Research, we specialize in delivering accurate, first-hand market intelligence through customized primary research solutions tailored to your unique business objectives. From CATI surveys and in-depth interviews to focus groups, online panels, and field research, our experienced team gathers high-quality data that empowers organizations to understand customer behavior, validate business strategies, and make confident, data-driven decisions.\n\nWith 16+ years of industry experience, 450+ advanced CATI workstations, research capabilities across 90+ countries, and support in 22+ languages, we combine global reach with deep local expertise. Our commitment to quality, precision, and innovation ensures every project delivers actionable insights that help businesses reduce risk, identify new opportunities, and achieve sustainable growth.',
};

/** Resolves every `*Filename` reference in a `ServiceDetailSeed` to an
 * uploaded media ID via `uploadAsset()`. `capabilities` maps onto the
 * existing `features` field (`blocks.feature-item`) rather than a
 * dedicated one — see the schema comment on that field. */
async function resolveServiceDetailSeed(strapi: any, detail: ServiceDetailSeed) {
  const heroImage = await uploadAsset(strapi, detail.heroImageFilename);
  const overviewImage = await uploadAsset(strapi, detail.overviewImageFilename);
  const enquiryImage = await uploadAsset(strapi, detail.enquiryImageFilename);

  const features = [];
  for (const cap of detail.capabilities) {
    features.push({
      title: cap.title,
      // blocks.feature-item requires `description`; the Capabilities
      // section (CapabilitiesSection.tsx) never renders it — Figma's
      // photo cards show only a title — so this is a non-empty,
      // schema-satisfying value only, not visible copy.
      description: cap.title,
      icon: await uploadAsset(strapi, cap.imageFilename),
      order: features.length,
    });
  }

  return {
    heroEyebrow: detail.heroEyebrow,
    heroHeading: detail.heroHeading,
    heroSubheading: detail.heroSubheading,
    heroImage,
    heroActions: detail.heroActions,
    trustHeading: detail.trustHeading,
    trustLogos: detail.trustLogos,
    overviewEyebrow: detail.overviewEyebrow,
    overviewHeading: detail.overviewHeading,
    overviewBody: detail.overviewBody,
    overviewImage,
    overviewFeatures: detail.overviewFeatures,
    capabilitiesEyebrow: detail.capabilitiesEyebrow,
    capabilitiesHeading: detail.capabilitiesHeading,
    capabilitiesBody: detail.capabilitiesBody,
    features,
    credentialsHeading: detail.credentialsHeading,
    credentialsBody: detail.credentialsBody,
    credentials: detail.credentials,
    methodologiesEyebrow: detail.methodologiesEyebrow,
    methodologiesHeading: detail.methodologiesHeading,
    methodologies: detail.methodologies,
    industriesEyebrow: detail.industriesEyebrow,
    industriesHeading: detail.industriesHeading,
    industriesBody: detail.industriesBody,
    industriesServed: detail.industriesServed,
    enquiryEyebrow: detail.enquiryEyebrow,
    enquiryHeading: detail.enquiryHeading,
    enquiryBody: detail.enquiryBody,
    enquiryImage,
    faqItems: detail.faqItems,
    aboutEyebrow: detail.aboutEyebrow,
    aboutHeading: detail.aboutHeading,
    aboutBody: detail.aboutBody,
  };
}

interface ServiceHierarchySeed extends ResearchContent {
  title: string;
  legacyUrl?: string;
  suggestedUrl?: string;
  children?: ServiceHierarchySeed[];
  /** Only "Primary Research" carries this — the rich, node-474:5731-
   * derived detail-page content. Every other service stays base-fields-
   * only, so every section on its page renders via the frontend's
   * template fallback (see views/services/detail/fallback.ts). */
  detail?: ServiceDetailSeed;
}

const SERVICES_HIERARCHY: ServiceHierarchySeed[] = [
  {
    title: 'Primary Research',
    legacyUrl: 'https://www.unimrkt.com/primary-research.php',
    suggestedUrl: 'https://www.unimrkt.com/services/primary-research.php',
    detail: PRIMARY_RESEARCH_DETAIL,
    summary: 'Primary Research designs and fields custom studies that collect first-hand data directly from your target audience, giving decision-makers evidence built specifically around their question. Every engagement is scoped to your sample, timeline, and budget.',
    overview: 'Our Primary Research team manages the full lifecycle of a custom study — sample design, questionnaire scripting, multi-mode fieldwork, and data validation — so you receive an analysis-ready dataset rather than raw responses. A dedicated research lead oversees quality control at every stage, from pilot testing through final tabulation.',
    stats: [['50K+', 'Respondents surveyed annually'], ['90+', 'Countries covered'], ['98%', 'Data quality pass rate'], ['15+', 'Years fielding primary studies']],
    useCases: "Primary Research underpins new product launches, pricing studies, brand tracking, and customer satisfaction programs across consumer and B2B markets — anywhere secondary data can't answer a company-specific question.",
    ctaHeading: 'Ready to field your next study?',
    ctaBody: 'Talk to a research specialist about designing a study around your exact objectives.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Each engagement follows a structured pipeline: an objective-setting workshop, sample and methodology design, questionnaire scripting, monitored fieldwork, and a validated final dataset with topline reporting. Phone, online, and in-person fieldwork modes are available depending on your target population.',
    metaDescription: "Custom primary market research — surveys, interviews, and fieldwork designed around your exact business question, fielded across 90+ countries.",
    keywords: 'primary research, market research, custom surveys, fieldwork, data collection',
    children: [
      {
        title: 'Telephonic Surveys',
        suggestedUrl: 'https://www.unimrkt.com/services/primary-research/telephonic-surveys.php',
        summary: 'Telephonic Surveys reach respondents directly by phone through trained interviewers, delivering higher completion rates and richer qualitative color than self-administered panels. This mode is especially effective for demographics underrepresented online.',
        overview: 'Our multilingual call centers are staffed with interviewers trained on your specific questionnaire, with live supervisor monitoring across every shift. Scripts are piloted before full fieldwork begins to catch comprehension issues early.',
        stats: [['75%', 'Average response rate'], ['12 min', 'Average interview length'], ['20+', 'Languages supported'], ['100%', 'Calls quality-monitored']],
        useCases: 'Ideal for customer satisfaction tracking, public-sector studies, and B2B decision-maker interviews, where a human voice improves both response rate and data depth.',
        ctaHeading: 'Need a telephonic fieldwork partner?',
        ctaBody: 'Get a fielding timeline and cost estimate for your target sample.',
        ctaLabel: 'Request a Fielding Quote',
        methodology: 'Call attempts are staggered across day-parts to maximize contact rates, and every completed interview passes a validation callback before entering the final dataset.',
        metaDescription: 'Phone-based survey fieldwork with trained multilingual interviewers, live quality monitoring, and validated data collection.',
        keywords: 'telephonic surveys, CATI, phone interviews, survey fieldwork',
      },
      {
        title: 'Online Surveys',
        suggestedUrl: 'https://www.unimrkt.com/services/primary-research/online-surveys.php',
        summary: 'Online Surveys deliver fast, cost-efficient data collection at scale through mobile-optimized questionnaires distributed across managed panels and your own customer lists. Real-time dashboards let you watch response rates as fieldwork progresses.',
        overview: 'Every online survey is built on a rigorously tested questionnaire platform with logic branching, quota management, and automated data-quality checks — speeders, straight-liners, and open-end gibberish are flagged automatically. Surveys are optimized for mobile completion, where most panel responses now originate.',
        stats: [['200K+', 'Panelists on tap'], ['48 hr', 'Typical fieldwork turnaround'], ['35+', 'Quota variables supported'], ['99%', 'Mobile-render compatibility']],
        useCases: 'Well suited to concept testing, tracking studies, and large-sample quantitative research where speed and cost-efficiency matter as much as depth.',
        ctaHeading: 'Launch your next online study',
        ctaBody: 'Get a sample and cost quote within one business day.',
        ctaLabel: 'Get a Fielding Quote',
        methodology: 'Quotas are monitored live throughout fieldwork with automatic panel rebalancing, and every dataset passes through a multi-point data-quality audit before delivery.',
        metaDescription: 'Fast, quota-managed online survey fieldwork with real-time dashboards and automated data-quality checks.',
        keywords: 'online surveys, panel research, quantitative survey, survey fieldwork',
      },
      {
        title: 'Focus Group Discussions',
        suggestedUrl: 'https://www.unimrkt.com/services/primary-research/focus-group-discussions.php',
        summary: "Focus Group Discussions bring 6-8 target respondents together with a trained moderator to surface the language and motivations behind a decision — insight a closed-ended survey can't capture. Sessions run in-person or via moderated video.",
        overview: 'Our moderators build a discussion guide around your specific hypotheses, then adapt in real time based on what respondents actually say. Clients can observe live via one-way mirror or secure video feed, with a same-day debrief summarizing key themes.',
        stats: [['6-8', 'Respondents per group'], ['90 min', 'Typical session length'], ['24 hr', 'Debrief delivery'], ['500+', 'Groups moderated to date']],
        useCases: "Commonly used ahead of a quantitative study (to generate hypotheses) or after one (to explain a surprising result), as well as standalone concept and messaging testing.",
        ctaHeading: 'Explore focus groups for your project',
        ctaBody: 'Discuss discussion-guide design with a qualitative moderator.',
        ctaLabel: 'Talk to a Moderator',
        methodology: 'Sessions are audio/video recorded with respondent consent, professionally transcribed, and coded thematically before a written report with verbatim quotes is delivered.',
        metaDescription: 'Moderated focus group discussions that surface the motivations and language behind consumer decisions, in-person or via video.',
        keywords: 'focus group discussions, qualitative research, moderated groups',
      },
      {
        title: 'CATI Surveys',
        suggestedUrl: 'https://www.unimrkt.com/services/primary-research/cati-surveys.php',
        summary: "CATI (Computer-Assisted Telephone Interviewing) Surveys combine live phone interviewing with software-driven scripting and real-time validation — phone-interview response quality with online-survey data discipline, in one method.",
        overview: 'Our CATI platform enforces questionnaire logic exactly as scripted (no interviewer transcription errors), auto-validates response ranges, and timestamps every call attempt for full fieldwork audit trails. Supervisors monitor live call quality across all interviewing shifts.',
        stats: [['30+', 'Concurrent interviewing stations'], ['85%', 'Contact-to-completion rate'], ['100%', 'Calls logged and auditable'], ['10+', 'Markets fielded simultaneously']],
        useCases: 'Well suited to omnibus surveys, brand tracking waves, and government/regulatory studies requiring a defensible, auditable fieldwork trail.',
        ctaHeading: 'Scale your tracking study with CATI',
        ctaBody: 'Ask about capacity for multi-market, multi-wave fieldwork.',
        ctaLabel: 'Talk to Fieldwork Ops',
        methodology: 'Every interviewer completes questionnaire-specific certification before dialing live respondents, and a random sample of calls is re-contacted for validation.',
        metaDescription: 'Computer-assisted telephone interviewing (CATI) with real-time validation, full audit trails, and multi-market fielding capacity.',
        keywords: 'CATI, computer-assisted telephone interviewing, survey fieldwork, tracking studies',
      },
    ],
  },
  {
    // Sheet's own "Suggested URL" column for this category's children
    // literally reads "/services/quantitative-research/..." even though
    // they're nested under Qualitative Research by row position — trusting
    // the row hierarchy (parent = Qualitative Research), not the evidently
    // mistyped legacy URL string. Flagged for the content team; not
    // silently "corrected" beyond preserving it verbatim in legacyUrl.
    title: 'Qualitative Research',
    legacyUrl: 'https://www.unimrkt.com/qualitative-research.php',
    suggestedUrl: 'https://www.unimrkt.com/services/qualitative-research.php',
    summary: "Qualitative Research explores the why behind consumer and stakeholder behavior through in-depth interviews and discussions, surfacing language and motivations that closed-ended surveys miss. Findings typically generate hypotheses ahead of a quantitative study.",
    overview: 'Our qualitative practice pairs experienced moderators with a structured analysis framework, so open-ended conversations translate into clear, defensible themes rather than anecdote. Every project includes a discussion guide built around your specific research questions and a coded analysis of every transcript.',
    stats: [['500+', 'Qualitative projects delivered'], ['15+', 'Trained moderators'], ['48 hr', 'Typical debrief turnaround'], ['12', 'Markets with local-language moderation']],
    useCases: "Used for concept and messaging exploration, journey mapping, and understanding decision-drivers that a survey's answer options can't anticipate.",
    ctaHeading: 'Considering a qualitative phase?',
    ctaBody: 'Talk to a moderator about the right qualitative method for your question.',
    ctaLabel: 'Talk to a Moderator',
    methodology: 'Every session is recorded, transcribed, and thematically coded; findings are delivered as a narrative report built around verbatim evidence, not just a topline summary.',
    metaDescription: 'In-depth qualitative research — interviews, discussions, and observational studies that surface the motivations behind behavior.',
    keywords: 'qualitative research, in-depth interviews, moderated research',
    children: [
      {
        title: 'In-depth Interviews',
        suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research/in-depth-interviews.php',
        summary: "In-depth Interviews are one-on-one conversations, typically 45-60 minutes, that let a skilled interviewer probe a single respondent's reasoning in depth — ideal when group dynamics would suppress candor, such as sensitive topics or senior executive interviews.",
        overview: 'Each interview follows a semi-structured guide, giving the interviewer room to follow up on unexpected answers while still covering every research objective. Sessions are conducted by phone, video, or in-person depending on respondent availability and topic sensitivity.',
        stats: [['45-60 min', 'Typical session length'], ['1:1', 'Interview format'], ['C-suite', 'Access to senior decision-makers'], ['100%', 'Sessions transcribed']],
        useCases: 'Common for B2B buyer research, executive and expert interviews, and sensitive consumer topics (health, finance) where group settings inhibit honesty.',
        ctaHeading: 'Need executive-level access?',
        ctaBody: 'Ask about our senior-decision-maker recruitment network.',
        ctaLabel: 'Discuss Your Study',
        methodology: 'Recruitment is screened against strict role/seniority criteria before scheduling, and every transcript is analyzed against a shared coding framework so findings are comparable across the full interview set.',
        metaDescription: 'One-on-one in-depth interviews that surface candid, detailed insight from consumers, executives, and expert respondents.',
        keywords: 'in-depth interviews, IDI, qualitative interviews, executive interviews',
      },
      {
        title: 'Focus Group Discussions',
        suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research/focus-group-discussions.php',
        summary: "Focus Group Discussions convene small groups of matched respondents to observe how opinions form and shift in a social setting — revealing group dynamics, consensus, and disagreement that one-on-one interviews can't surface.",
        overview: 'Groups are recruited to a strict respondent profile and moderated using a guide built around your specific hypotheses, with real-time client observation available via video or one-way mirror.',
        stats: [['6-8', 'Respondents per group'], ['2-3', 'Groups per market (typical)'], ['90 min', 'Typical session length'], ['24 hr', 'Debrief turnaround']],
        useCases: "Effective for concept screening, packaging and messaging testing, and understanding how a target segment talks about a category among peers.",
        ctaHeading: 'Plan your next group',
        ctaBody: 'Talk to a moderator about respondent profile and guide design.',
        ctaLabel: 'Talk to a Moderator',
        methodology: 'Sessions are recorded and coded thematically; a written report highlights consensus, outliers, and illustrative verbatims for each research objective.',
        metaDescription: 'Group-based qualitative discussions that reveal how target audiences form and debate opinions on your category.',
        keywords: 'focus groups, group discussions, qualitative research',
      },
      {
        title: 'Online Bulletin Board',
        suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research/online-bulletin-board.php',
        summary: 'Online Bulletin Boards (asynchronous qualitative communities) engage respondents over several days through structured daily activities, giving people time to reflect rather than answer on the spot — and letting you reach geographically dispersed participants in one study.',
        overview: 'Participants log in daily to respond to text, image, or video prompts set by a moderator, who can probe individual answers in real time throughout the fielding window. The extended format surfaces more considered, detailed responses than a single-session interview.',
        stats: [['3-10', 'Typical fielding days'], ['20-40', 'Participants per board'], ['3x', 'More content vs. a single session'], ['Mobile-first', 'Participation experience']],
        useCases: 'Well suited to diary-style studies (usage over time), multi-market qualitative research, and topics that benefit from reflection time, like major purchase decisions.',
        ctaHeading: 'Explore an online bulletin board study',
        ctaBody: 'Ask how an asynchronous community could fit your timeline.',
        ctaLabel: 'Discuss Your Study',
        methodology: 'A moderator posts daily activities and probes responses throughout the fielding window; all contributions are coded and synthesized into a themed final report.',
        metaDescription: 'Asynchronous online qualitative communities that capture considered, detailed feedback over several days.',
        keywords: 'online bulletin board, asynchronous qualitative research, online communities',
      },
      {
        title: 'In-Home Usage Tests (iHUTs)',
        suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research/in-home-usage-tests.php',
        summary: "In-Home Usage Tests place your product directly in respondents' homes for real-world use over days or weeks, capturing authentic reactions to performance, packaging, and repeat-use behavior that a lab or intercept test can't replicate.",
        overview: 'Respondents are recruited to your target profile, receive the product with a structured usage diary or app-based survey, and report back on defined touchpoints throughout the test period. Products can be tested blind or branded, and against a competitive benchmark.',
        stats: [['7-21 days', 'Typical test duration'], ['100-300', 'Households per study'], ['Blind or branded', 'Test formats available'], ['App or diary', 'Data-capture options']],
        useCases: 'Standard for FMCG and personal-care product testing, packaging evaluation, and claims substantiation ahead of a launch.',
        ctaHeading: 'Test your product in real homes',
        ctaBody: 'Ask about recruitment and diary design for your category.',
        ctaLabel: 'Discuss Your Study',
        methodology: 'Usage diaries are collected at defined intervals and analyzed alongside a post-use survey to separate first-impression reactions from sustained-use satisfaction.',
        metaDescription: 'In-home product usage testing that captures authentic, real-world reactions over days or weeks of actual use.',
        keywords: 'in-home usage test, iHUT, product testing, FMCG research',
      },
    ],
  },
  {
    title: 'Quantitative Research',
    legacyUrl: 'https://www.unimrkt.com/quantitative-research.php',
    suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research.php',
    summary: 'Quantitative Research delivers statistically representative data at scale — measuring not just what people think, but how many, and by how much — so decisions can be sized, prioritized, and tracked over time with confidence.',
    overview: 'We design quantitative studies around the specific hypothesis you need to test, from simple concept scoring to complex conjoint and MaxDiff exercises, then deliver clean, weighted datasets alongside statistical significance testing.',
    stats: [['n=1,000+', 'Typical sample size'], ['95%', 'Standard confidence level'], ['40+', 'Markets fielded'], ['Real-time', 'Dashboard reporting available']],
    useCases: "Applied to market sizing, pricing and trade-off analysis, brand tracking, and any decision that needs a defensible number attached to it.",
    ctaHeading: 'Size your next decision',
    ctaBody: 'Talk to a quant specialist about sample design and analysis approach.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Every study includes a documented weighting and significance-testing methodology, so results are both statistically sound and easy to defend internally.',
    metaDescription: 'Statistically representative quantitative research — surveys, tracking, and advanced analytics sized for confident decisions.',
    keywords: 'quantitative research, market sizing, statistical research, survey research',
    children: [
      {
        title: 'Telephonic Interviews',
        suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research/telephonic-interviews.php',
        summary: 'Telephonic Interviews deliver structured quantitative data collection by phone, combining a scripted questionnaire with the reach and response quality of live interviewing — particularly valuable for hard-to-reach B2B and demographic segments.',
        overview: 'Interviewers follow a fully scripted, quota-managed questionnaire with supervisor monitoring throughout fielding, giving you quantitative-grade data with the completion rates phone interviewing is known for.',
        stats: [['70%+', 'Completion rate'], ['15 min', 'Typical interview length'], ['B2B & consumer', 'Sample types supported'], ['100%', 'Quality-monitored']],
        useCases: 'Common for B2B decision-maker surveys, low-incidence population studies, and markets where online panel coverage is limited.',
        ctaHeading: 'Reach a hard-to-find sample',
        ctaBody: 'Ask about feasibility for your target respondent profile.',
        ctaLabel: 'Request a Fielding Quote',
        methodology: 'Quotas are tracked live throughout the fielding period, with automatic rebalancing to keep the final sample representative of your target population.',
        metaDescription: 'Structured phone-based quantitative interviewing for hard-to-reach B2B and consumer samples.',
        keywords: 'telephonic interviews, phone survey, quantitative interviewing',
      },
      {
        title: 'Global Panel',
        suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research/global-panel.php',
        summary: 'Our Global Panel gives you direct access to pre-recruited, profiled respondents across 90+ countries, cutting fieldwork time for multi-market studies from weeks to days without sacrificing sample quality.',
        overview: 'Panelists are recruited and profiled across hundreds of demographic and behavioral attributes, refreshed regularly to guard against professional-respondent bias, and validated through ongoing digital fingerprinting and attention checks.',
        stats: [['90+', 'Countries covered'], ['500K+', 'Active profiled panelists'], ['300+', 'Profiling attributes'], ['<48 hr', 'Typical multi-market fielding']],
        useCases: 'The backbone of global tracking studies, multi-country concept tests, and any project needing fast, consistent fielding across markets.',
        ctaHeading: 'Field across markets, fast',
        ctaBody: 'Ask about panel feasibility and cost for your target countries.',
        ctaLabel: 'Check Panel Feasibility',
        methodology: 'Panel quality is maintained through continuous validation — digital fingerprinting, attention-check questions, and regular re-profiling — with low-quality respondents removed on an ongoing basis.',
        metaDescription: 'A profiled global research panel spanning 90+ countries for fast, high-quality multi-market fieldwork.',
        keywords: 'global panel, online panel, multi-country research, panel research',
      },
      {
        title: 'Intercept Interview',
        suggestedUrl: 'https://www.unimrkt.com/services/quantitative-research/intercept-interview.php',
        summary: "Intercept Interviews approach respondents in real-world locations — retail stores, malls, events, transit hubs — capturing reactions and behavior at the exact moment and place they're most relevant to your research question.",
        overview: 'Trained field interviewers are deployed to locations matched to your target audience, using a short structured questionnaire designed for a brief, in-the-moment interaction. Locations and quotas are managed to ensure a representative sample of foot traffic.',
        stats: [['3-5 min', 'Typical interview length'], ['Multiple sites', 'Simultaneous fielding'], ['Real-world context', 'Data captured in-moment'], ['High engagement', 'Response quality']],
        useCases: 'Common for retail and shopper research, event and experience evaluation, and studies needing feedback tied to a specific physical location.',
        ctaHeading: 'Reach shoppers where they decide',
        ctaBody: 'Ask about intercept locations and feasibility for your category.',
        ctaLabel: 'Discuss Your Study',
        methodology: 'Field teams are briefed on location-specific quotas and monitored for interviewing consistency, with completed interviews validated against location and time-stamp data.',
        metaDescription: 'On-location intercept interviewing that captures in-the-moment consumer reactions at retail, events, and transit locations.',
        keywords: 'intercept interviews, shopper research, on-location research',
      },
    ],
  },
  {
    title: 'Business Research',
    legacyUrl: 'https://www.unimrkt.com/business-research.php',
    suggestedUrl: 'https://www.unimrkt.com/services/business-research.php',
    summary: 'Business Research applies rigorous research methods to strategic business questions — market entry, competitive positioning, and partnership evaluation — giving leadership teams evidence-based input for high-stakes decisions.',
    overview: 'We combine primary interviews with desk research and financial/market data to build a complete picture for strategic decisions, tailoring the engagement model to your timeline, confidentiality needs, and internal stakeholder group.',
    stats: [['200+', 'Strategic engagements delivered'], ['15+', 'Industries covered'], ['4-8 weeks', 'Typical engagement length'], ['C-suite', 'Primary audience for deliverables']],
    useCases: 'Used for market-entry feasibility studies, competitive benchmarking, M&A due diligence support, and partner/vendor evaluation.',
    ctaHeading: 'Bring evidence to your next strategic decision',
    ctaBody: 'Talk to us about the right engagement model for your timeline.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Engagements typically combine stakeholder interviews, secondary/desk research, and structured competitive analysis, synthesized into an executive-ready findings deck.',
    metaDescription: 'Strategic business research — market entry, competitive positioning, and partnership evaluation backed by rigorous methodology.',
    keywords: 'business research, market entry research, competitive analysis, strategic research',
    children: [
      {
        title: 'Our Engagement Models',
        suggestedUrl: 'https://www.unimrkt.com/services/business-research/our-engagement-models.php',
        summary: "Our Engagement Models describe the flexible ways we partner on Business Research work — from a fixed-scope project to an ongoing embedded research retainer — so the commercial structure fits how your team actually makes decisions.",
        overview: 'Clients can engage us project-by-project for a defined deliverable, on a retainer for ongoing strategic questions, or as an embedded extension of an internal insights team for larger organizations. Each model includes a named lead and a documented scope/timeline.',
        stats: [['3', 'Engagement models offered'], ['4-8 weeks', 'Typical project-based timeline'], ['12-month', 'Typical retainer term'], ['Dedicated lead', 'On every engagement']],
        useCases: 'Choose project-based work for a single defined decision, a retainer for recurring strategic questions, or embedded support when research needs are continuous.',
        ctaHeading: 'Find the right engagement model',
        ctaBody: "Talk to us about which model fits your team's needs.",
        ctaLabel: 'Discuss Engagement Options',
        methodology: 'Every engagement — regardless of model — starts with a scoping conversation to align on objectives, deliverables, and decision timeline before work begins.',
        metaDescription: 'Flexible engagement models for business research — project-based, retainer, or embedded — built around how your team decides.',
        keywords: 'engagement models, research retainer, consulting engagement',
      },
    ],
  },
  {
    title: 'Research Support Functions',
    legacyUrl: 'https://www.unimrkt.com/research-support-functions.php',
    suggestedUrl: 'https://www.unimrkt.com/services/research-support-functions.php',
    summary: 'Research Support Functions cover the operational backbone of a research program — survey programming, data processing, and verbatim coding — so your primary and quantitative studies convert into clean data faster and more accurately.',
    overview: 'Our operations team scripts complex questionnaires (logic, quotas, multi-language), processes and tabulates raw data against your specifications, and codes open-ended responses into analyzable categories, working as an extension of your project team.',
    stats: [['99.5%', 'Scripting accuracy rate'], ['24-48 hr', 'Standard tabulation turnaround'], ['30+', 'Languages supported'], ['1M+', 'Verbatims coded annually']],
    useCases: 'Used by internal research teams and other agencies who need reliable programming, processing, or coding capacity without building it in-house.',
    ctaHeading: 'Add processing capacity to your team',
    ctaBody: 'Ask about survey programming and data processing turnaround.',
    ctaLabel: 'Talk to Operations',
    methodology: "Every script and tab plan is QA'd against the original questionnaire before delivery, with a documented sign-off process at each stage.",
    metaDescription: 'Survey programming, data processing, and verbatim coding support that turns raw fieldwork into clean, analyzable data.',
    keywords: 'survey programming, data processing, research operations',
    children: [
      {
        title: 'Survey Programming',
        suggestedUrl: 'https://www.unimrkt.com/services/research-support-functions/survey-programming.php',
        summary: 'Survey Programming turns a paper questionnaire into a fully logic-tested, quota-managed, multi-device survey instrument — handling everything from simple linear surveys to complex conjoint and MaxDiff designs.',
        overview: 'Our programmers build in every skip pattern, piping, and quota rule specified in your questionnaire, then run a full logic test against edge cases before fieldwork launches. Surveys are built mobile-first and tested across devices and browsers.',
        stats: [['99.5%', 'Logic-test accuracy'], ['48 hr', 'Typical build turnaround'], ['Conjoint & MaxDiff', 'Advanced designs supported'], ['All devices', 'Cross-platform tested']],
        useCases: 'Needed for any custom quantitative study — especially those with complex logic, advanced analytical designs, or tight fielding timelines.',
        ctaHeading: 'Get your survey built and tested',
        ctaBody: 'Send us your questionnaire for a programming quote.',
        ctaLabel: 'Request a Programming Quote',
        methodology: "Every build goes through a dry-run test covering every logic path and quota combination before it's released to fieldwork.",
        metaDescription: 'Professional survey programming — logic, quotas, and advanced designs built and tested before fieldwork launches.',
        keywords: 'survey programming, questionnaire scripting, survey logic testing',
      },
      {
        title: 'Data Processing and Tabulation',
        suggestedUrl: 'https://www.unimrkt.com/services/research-support-functions/data-processing-and-tabulation.php',
        summary: 'Data Processing and Tabulation converts raw survey data into clean, weighted, cross-tabulated tables ready for analysis — handling data cleaning, weighting, banner construction, and significance testing to your exact specification.',
        overview: 'We validate incoming data against expected ranges and logic, apply any required weighting scheme, and produce banner tables with significance testing, delivered in the format your analysts already work in (Excel, SPSS, or a live dashboard).',
        stats: [['24-48 hr', 'Standard turnaround'], ['100%', 'Data validated before tabulation'], ['Multiple formats', 'Excel, SPSS, dashboards'], ['Custom weighting', 'Available on every project']],
        useCases: "Used whenever raw fieldwork data needs to become decision-ready tables — whether from our own fieldwork or a dataset you've collected elsewhere.",
        ctaHeading: 'Turn raw data into ready tables',
        ctaBody: 'Send us your data file for a tabulation quote.',
        ctaLabel: 'Request a Tabulation Quote',
        methodology: 'Every dataset passes a validation pass (range checks, logic consistency) before weighting and tabulation, with a QA review of the final tables against the tab plan.',
        metaDescription: 'Data processing and tabulation services — cleaning, weighting, and cross-tab reporting delivered in your preferred format.',
        keywords: 'data processing, data tabulation, survey data analysis',
      },
      {
        title: 'Verbatim Coding & Processing',
        suggestedUrl: 'https://www.unimrkt.com/services/research-support-functions/verbatim-coding-and-processing.php',
        summary: 'Verbatim Coding & Processing turns open-ended survey responses into structured, quantifiable categories — so the richest, most candid feedback in your dataset becomes something you can actually chart and track.',
        overview: 'Coders develop a codebook grounded in your actual response data (not a generic template), then apply it consistently across every verbatim, with inter-coder reliability checks to ensure consistency across large volumes.',
        stats: [['1M+', 'Verbatims coded annually'], ['95%+', 'Inter-coder reliability target'], ['Custom codebooks', 'Built per project'], ['Multi-language', 'Coding supported']],
        useCases: 'Applied to open-ended survey questions, customer service transcripts, and social listening data wherever unstructured text needs to become reportable categories.',
        ctaHeading: 'Make your open-ends reportable',
        ctaBody: 'Ask about codebook development for your response data.',
        ctaLabel: 'Discuss Your Data',
        methodology: 'A sample of coded responses is double-coded and checked for inter-coder reliability before the full volume is processed, catching codebook ambiguity early.',
        metaDescription: 'Verbatim coding that turns open-ended survey responses into structured, trackable categories.',
        keywords: 'verbatim coding, open-end coding, text analysis',
      },
    ],
  },
  {
    title: 'AI-Driven Analytics & Predictive Insights',
    suggestedUrl: 'https://www.unimrkt.com/services/ai-driven-analytics-predictive-insights.php',
    summary: 'AI-Driven Analytics & Predictive Insights applies machine learning to research and behavioral data to forecast outcomes and surface patterns a manual analysis would miss — turning historical data into a forward-looking decision tool.',
    overview: 'Our data science team builds models specific to your business question — demand forecasting, churn prediction, segmentation — validated against holdout data before being handed over with clear documentation of assumptions and limitations.',
    stats: [['85%+', 'Typical model accuracy target'], ['10+', 'Industries modeled'], ['Real-time', 'Dashboard refresh available'], ['Explainable AI', 'Models documented, not black-box']],
    useCases: 'Applied to demand and market forecasting, customer segmentation, and text/sentiment analysis at a scale manual coding can\'t match.',
    ctaHeading: 'Put your data to predictive use',
    ctaBody: 'Talk to our data science team about your use case.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: "Models are trained on historical data, validated against a holdout sample, and documented in plain language so stakeholders understand what's driving each prediction.",
    metaDescription: 'AI-driven predictive analytics that turn research and behavioral data into forward-looking business forecasts.',
    keywords: 'AI analytics, predictive insights, machine learning research, data science',
    children: [
      {
        title: 'Predictive Market Modeling',
        suggestedUrl: 'https://www.unimrkt.com/services/ai-driven-analytics-predictive-insights/predictive-market-modeling.php',
        summary: 'Predictive Market Modeling forecasts demand, share, and market size under different scenarios, letting you stress-test a strategy before committing budget to it — grounded in your historical data plus relevant market signals.',
        overview: 'We build models calibrated to your specific market using historical sales, survey, and third-party data, then run scenario analysis so you can see how a pricing change, new entrant, or macro shift would likely affect outcomes.',
        stats: [['Multi-scenario', 'Modeling approach'], ['85%+', 'Typical accuracy vs. holdout'], ['Historical + survey', 'Data sources combined'], ['Quarterly', 'Recommended model refresh']],
        useCases: 'Used for demand forecasting, market-share simulation, and stress-testing pricing or product decisions before launch.',
        ctaHeading: 'Model your market before you move',
        ctaBody: 'Ask about building a predictive model for your category.',
        ctaLabel: 'Discuss Your Model',
        methodology: 'Models are validated against historical holdout periods before being used prospectively, with documented confidence intervals on every forecast.',
        metaDescription: 'Predictive market modeling that forecasts demand, share, and scenario outcomes before you commit budget.',
        keywords: 'predictive modeling, market forecasting, demand forecasting',
      },
      {
        title: 'AI-Powered Text & Sentiment Analysis',
        suggestedUrl: 'https://www.unimrkt.com/services/ai-driven-analytics-predictive-insights/ai-powered-text-sentiment-analysis.php',
        summary: "AI-Powered Text & Sentiment Analysis processes large volumes of open-ended survey responses, reviews, and social data automatically — surfacing sentiment and themes at a scale manual coding can't reach, in a fraction of the time.",
        overview: "Our models are tuned to your category's specific vocabulary (not a generic sentiment classifier), then validated against a human-coded sample to confirm accuracy before full-scale processing begins.",
        stats: [['100K+', 'Text records processed per project (typical)'], ['90%+', 'Sentiment-accuracy vs. human coding'], ['Real-time', 'Processing for ongoing feeds'], ['Multi-language', 'Analysis supported']],
        useCases: "Applied to open-ended survey data, product review mining, and social/customer-service text at a volume manual coding can't cover.",
        ctaHeading: 'Analyze text at scale',
        ctaBody: 'Ask about processing your open-end or review data.',
        ctaLabel: 'Discuss Your Data',
        methodology: 'Models are validated against a human-coded benchmark sample before being applied at full scale, with ongoing spot-checks during processing.',
        metaDescription: 'AI-powered text and sentiment analysis that processes large volumes of open-ended and social data accurately and fast.',
        keywords: 'sentiment analysis, text analytics, AI text analysis, NLP research',
      },
      {
        title: 'Automated Data Processing & Dashboards',
        suggestedUrl: 'https://www.unimrkt.com/services/ai-driven-analytics-predictive-insights/automated-data-processing-dashboards.php',
        summary: "Automated Data Processing & Dashboards replace static reports with live, self-service views of your research data — so stakeholders can explore results themselves instead of waiting for the next deck.",
        overview: 'We build dashboards connected directly to your data pipeline, refreshing automatically as new data arrives, with filters and drill-downs configured around the questions your stakeholders actually ask.',
        stats: [['Real-time', 'Or scheduled refresh options'], ['Self-service', 'Filtering and drill-down'], ['Multi-source', 'Data integration supported'], ['Custom views', 'Per stakeholder group']],
        useCases: 'Ideal for always-on tracking studies, customer feedback programs, and any research feed that stakeholders need to monitor continuously rather than review quarterly.',
        ctaHeading: 'Give your data a live home',
        ctaBody: 'Ask about connecting a dashboard to your existing data feed.',
        ctaLabel: 'Discuss Your Dashboard',
        methodology: 'Dashboards are built and validated against source data before go-live, with a defined refresh schedule and access-control setup per stakeholder group.',
        metaDescription: 'Automated dashboards that turn research and tracking data into a live, self-service view for stakeholders.',
        keywords: 'data dashboards, automated reporting, research dashboards',
      },
      {
        title: 'Machine-Learning Based Segmentation',
        suggestedUrl: 'https://www.unimrkt.com/services/ai-driven-analytics-predictive-insights/machine-learning-segmentation.php',
        summary: 'Machine-Learning Based Segmentation groups your customers or respondents into meaningful, actionable segments using statistical clustering rather than gut-feel categories — grounded in the attitudes and behaviors that actually predict outcomes.',
        overview: "We test multiple clustering approaches against your data to find the segmentation that's both statistically robust and business-usable, then build a simple scoring tool so new customers can be assigned to a segment going forward.",
        stats: [['4-7', 'Typical segment count'], ['Multiple algorithms', 'Tested per project'], ['Scoring tool', 'Delivered for ongoing use'], ['Validated', 'Against holdout data']],
        useCases: 'Used for customer segmentation, message and product targeting, and any strategy that needs to treat different customer groups differently.',
        ctaHeading: 'Find your real customer segments',
        ctaBody: 'Ask about segmentation approaches for your dataset.',
        ctaLabel: 'Discuss Segmentation',
        methodology: 'Candidate segmentation solutions are evaluated on both statistical fit and business interpretability before one is selected and validated against holdout data.',
        metaDescription: 'Machine-learning based customer segmentation that groups audiences by what actually predicts their behavior.',
        keywords: 'segmentation, customer segmentation, machine learning segmentation',
      },
    ],
  },
  {
    title: 'Comprehensive CX & Customer Journey Research',
    suggestedUrl: 'https://www.unimrkt.com/services/cx-customer-journey-research.php',
    summary: 'Comprehensive CX & Customer Journey Research maps the full end-to-end customer experience across every touchpoint, identifying exactly where friction is costing you customers and revenue — and what to fix first.',
    overview: 'We combine journey mapping workshops, voice-of-customer data, and performance metrics into a single view of the customer experience, prioritized by business impact so your team knows where to act first.',
    stats: [['360°', 'Touchpoint coverage'], ['Multi-channel', 'VoC data integration'], ['Prioritized', 'Action-ready recommendations'], ['Ongoing or one-time', 'Engagement options']],
    useCases: 'Used for CX transformation programs, touchpoint-level performance measurement, and identifying the highest-impact fixes in a customer journey.',
    ctaHeading: 'Map your customer journey',
    ctaBody: 'Talk to us about a CX diagnostic for your business.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Journey maps are built from a combination of workshop input, VoC data, and operational metrics, then validated with the customers who actually live the journey.',
    metaDescription: 'End-to-end customer journey and CX research that identifies and prioritizes the highest-impact experience fixes.',
    keywords: 'customer experience research, CX research, journey mapping',
    children: [
      {
        title: 'Customer Journey Mapping Workshops',
        suggestedUrl: 'https://www.unimrkt.com/services/cx-customer-journey-research/customer-journey-mapping-workshops.php',
        summary: 'Customer Journey Mapping Workshops bring your cross-functional team together to build a shared, evidence-based view of the customer journey — surfacing internal misalignment about the experience as much as the experience itself.',
        overview: 'We facilitate structured workshops combining internal stakeholder input with existing customer data, producing a visual journey map annotated with pain points, emotions, and ownership at each stage.',
        stats: [['1-2 days', 'Typical workshop length'], ['Cross-functional', 'Stakeholder participation'], ['Visual output', 'Annotated journey map'], ['Action plan', 'Delivered post-workshop']],
        useCases: 'A strong starting point for any CX initiative, especially where teams disagree about what the customer journey actually looks like today.',
        ctaHeading: 'Align your team on the journey',
        ctaBody: 'Ask about running a mapping workshop with your team.',
        ctaLabel: 'Schedule a Workshop',
        methodology: 'Workshops combine facilitated exercises with existing customer data to ground the map in evidence, not just internal assumption.',
        metaDescription: 'Facilitated customer journey mapping workshops that align teams around an evidence-based view of the experience.',
        keywords: 'journey mapping workshop, customer journey mapping, CX workshop',
      },
      {
        title: 'Multi-Channel VoC (Voice of Customer) Programs',
        suggestedUrl: 'https://www.unimrkt.com/services/cx-customer-journey-research/multi-channel-voc-programs.php',
        summary: 'Multi-Channel VoC Programs continuously capture customer feedback across surveys, reviews, support interactions, and social channels — replacing a once-a-year survey with an always-on read of how customers actually feel.',
        overview: 'We integrate feedback from every channel your customers use into a single unified view, applying consistent sentiment and theme coding so trends are comparable across channels and over time.',
        stats: [['Always-on', 'Feedback capture'], ['5+', 'Channels typically integrated'], ['Unified', 'Sentiment & theme coding'], ['Trend tracking', 'Built in from day one']],
        useCases: 'Used by organizations that want continuous CX measurement rather than periodic surveys, and need one consistent view across every feedback channel.',
        ctaHeading: 'Build your VoC program',
        ctaBody: 'Ask about integrating your feedback channels into one program.',
        ctaLabel: 'Discuss a VoC Program',
        methodology: 'Feedback from each channel is normalized to a common taxonomy so themes and sentiment can be compared and tracked consistently across sources.',
        metaDescription: 'Multi-channel Voice of Customer programs that unify feedback across surveys, reviews, and support into one continuous view.',
        keywords: 'voice of customer, VoC program, customer feedback research',
      },
      {
        title: 'CX Performance Metrics & Dashboards',
        suggestedUrl: 'https://www.unimrkt.com/services/cx-customer-journey-research/cx-performance-metrics-dashboards.php',
        summary: 'CX Performance Metrics & Dashboards track NPS, CSAT, and effort scores at the touchpoint level, connected to a live dashboard — so CX performance becomes something your team monitors continuously, not something you learn about in a quarterly report.',
        overview: 'We define the right metric for each touchpoint (not just an overall company score), connect data collection to your operational systems, and build a dashboard your team checks as part of daily operations.',
        stats: [['NPS, CSAT, CES', 'Metrics supported'], ['Touchpoint-level', 'Measurement granularity'], ['Live dashboard', 'Included'], ['Automated alerts', 'Available for score drops']],
        useCases: 'Applied wherever a business wants ongoing, touchpoint-level visibility into CX performance rather than a single company-wide score.',
        ctaHeading: 'Track CX like it matters',
        ctaBody: 'Ask about setting up touchpoint-level CX metrics.',
        ctaLabel: 'Discuss Your Metrics',
        methodology: 'Metrics are defined per touchpoint in collaboration with the teams that own them, then connected to a live dashboard with automated alerting on significant score changes.',
        metaDescription: 'Touchpoint-level CX metrics and live dashboards — NPS, CSAT, and effort score tracking built into daily operations.',
        keywords: 'CX metrics, NPS dashboard, CSAT tracking, customer experience metrics',
      },
      {
        title: 'Pain Point Analysis & Action Planning',
        suggestedUrl: 'https://www.unimrkt.com/services/cx-customer-journey-research/pain-point-analysis-action-planning.php',
        summary: "Pain Point Analysis & Action Planning identifies exactly where and why customers struggle in their journey, then translates findings into a prioritized, owned action plan — so CX research leads to fixed problems, not just a report on a shelf.",
        overview: 'We quantify the business impact of each identified pain point (customers affected, revenue at risk, ease of fix) so your team can prioritize with confidence, then work with you to assign ownership and timelines for the top fixes.',
        stats: [['Impact-scored', 'Every pain point ranked'], ['Prioritized roadmap', 'Delivered as output'], ['Cross-functional', 'Ownership assigned'], ['Follow-up review', 'Included']],
        useCases: "The natural next step after journey mapping or VoC research, when a business needs to move from 'here's what's wrong' to 'here's what we're fixing first.'",
        ctaHeading: 'Turn insight into action',
        ctaBody: 'Ask about building a prioritized action plan from your CX data.',
        ctaLabel: 'Discuss Action Planning',
        methodology: 'Each pain point is scored on customer impact and fix feasibility, producing a prioritized roadmap that\'s reviewed with stakeholders before finalizing ownership.',
        metaDescription: 'Pain point analysis and action planning that turns CX research findings into a prioritized, owned roadmap.',
        keywords: 'pain point analysis, CX action planning, customer experience improvement',
      },
    ],
  },
  {
    title: 'Social Media Intelligence & Sentiment Analysis',
    suggestedUrl: 'https://www.unimrkt.com/services/social-media-intelligence-sentiment-analysis.php',
    summary: "Social Media Intelligence & Sentiment Analysis monitors what's being said about your brand, category, and competitors across social platforms in real time — turning unstructured social chatter into a structured, trackable signal.",
    overview: 'We combine automated listening tools with human-reviewed sentiment coding tuned to your category, tracking volume, sentiment, and emerging themes so you catch shifts in brand perception before they show up in sales data.',
    stats: [['Real-time', 'Monitoring across platforms'], ['90%+', 'Sentiment-accuracy vs. human review'], ['Included', 'Competitor benchmarking'], ['Custom alerts', 'For volume or sentiment spikes']],
    useCases: 'Used for brand health tracking, campaign monitoring, competitive benchmarking, and early warning on emerging PR issues.',
    ctaHeading: "Know what's being said, as it happens",
    ctaBody: 'Talk to us about setting up social listening for your brand.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Automated collection is paired with periodic human-reviewed sentiment validation to keep classification accuracy high as language and slang evolve.',
    metaDescription: 'Real-time social media intelligence and sentiment analysis that tracks brand perception across every major platform.',
    keywords: 'social media intelligence, sentiment analysis, social listening, brand tracking',
    children: [
      {
        title: 'Social Listening & Brand Sentiment Tracking',
        suggestedUrl: 'https://www.unimrkt.com/services/social-media-intelligence-sentiment-analysis/social-listening-brand-sentiment-tracking.php',
        summary: 'Social Listening & Brand Sentiment Tracking continuously monitors owned, earned, and competitor mentions across social platforms, giving you an always-on read on brand sentiment rather than a point-in-time survey snapshot.',
        overview: 'We track mention volume, sentiment, and share of voice against a defined competitive set, with a live dashboard and scheduled reporting so trends are visible to stakeholders without waiting for the next research wave.',
        stats: [['24/7', 'Monitoring coverage'], ['Multi-platform', 'Coverage across social channels'], ['Share of voice', 'Tracked vs. competitors'], ['Alerting', 'On sentiment or volume shifts']],
        useCases: 'Applied to ongoing brand health tracking, campaign performance monitoring, and crisis/issue early-warning.',
        ctaHeading: 'Start tracking brand sentiment',
        ctaBody: 'Ask about setting up ongoing social listening for your brand.',
        ctaLabel: 'Discuss Social Listening',
        methodology: "Mentions are classified by sentiment and topic using a model validated against your category's language, refreshed periodically to stay accurate.",
        metaDescription: 'Ongoing social listening and brand sentiment tracking across every major social platform.',
        keywords: 'social listening, brand sentiment, social media monitoring',
      },
      {
        title: 'Competitor Mentions & Benchmarking',
        suggestedUrl: 'https://www.unimrkt.com/services/social-media-intelligence-sentiment-analysis/competitor-mentions-benchmarking.php',
        summary: "Competitor Mentions & Benchmarking tracks how your brand's social presence compares to named competitors — volume, sentiment, and share of voice — so you know exactly where you're winning and losing the conversation.",
        overview: 'We define a competitive set with you, then track mention volume and sentiment for each brand side-by-side, surfacing the specific themes driving any gap in perception.',
        stats: [['Side-by-side', 'Competitor comparison'], ['Share of voice', 'Core metric tracked'], ['Theme-level', 'Gap analysis included'], ['Per client', 'Custom competitive set defined']],
        useCases: 'Used ahead of brand strategy reviews, campaign planning, and category entry decisions where competitive positioning matters.',
        ctaHeading: 'See where you stand vs. competitors',
        ctaBody: 'Ask about benchmarking your brand against a defined competitive set.',
        ctaLabel: 'Discuss Benchmarking',
        methodology: 'Mention data for each competitor is normalized to the same taxonomy and time window to ensure a fair, like-for-like comparison.',
        metaDescription: 'Competitor mention tracking and social benchmarking that shows exactly where your brand wins and loses the conversation.',
        keywords: 'competitor benchmarking, competitive analysis, social media benchmarking',
      },
      {
        title: 'Industry Trend Monitoring',
        suggestedUrl: 'https://www.unimrkt.com/services/social-media-intelligence-sentiment-analysis/industry-trend-monitoring.php',
        summary: 'Industry Trend Monitoring tracks emerging conversations, topics, and shifts across your category on social and public channels — giving you early visibility into trends before they show up in industry reports.',
        overview: 'We monitor category-wide conversation (not just your brand) to surface emerging topics, terminology, and shifts in consumer interest, flagging trends early enough to inform product and marketing planning.',
        stats: [['Category-wide', 'Monitoring scope'], ['Early signal', 'Detection focus'], ['Trend reports', 'Delivered on a defined cadence'], ['Custom taxonomy', 'Per category']],
        useCases: 'Used for innovation pipeline planning, content and campaign strategy, and staying ahead of shifting category conversation.',
        ctaHeading: "Spot trends before your competitors do",
        ctaBody: 'Ask about ongoing trend monitoring for your category.',
        ctaLabel: 'Discuss Trend Monitoring',
        methodology: 'Category conversation is tracked against a custom taxonomy built for your industry, with periodic review to catch newly emerging topics and terminology.',
        metaDescription: 'Industry trend monitoring that surfaces emerging category conversation before it shows up in industry reports.',
        keywords: 'trend monitoring, industry trends, social trend analysis',
      },
      {
        title: 'Influencer Mapping & Engagement Insights',
        suggestedUrl: 'https://www.unimrkt.com/services/social-media-intelligence-sentiment-analysis/influencer-mapping-engagement-insights.php',
        summary: 'Influencer Mapping & Engagement Insights identifies who actually drives conversation and opinion in your category — not just who has the most followers — and measures how their content moves sentiment and awareness.',
        overview: 'We map the influencer landscape in your category by reach, relevance, and actual audience engagement, then track how influencer content correlates with shifts in brand mention volume and sentiment.',
        stats: [['Reach + relevance', 'Scoring approach'], ['Engagement quality', 'Weighted over follower count'], ['Category mapping', 'Full influencer landscape'], ['Correlation tracking', 'Vs. brand sentiment']],
        useCases: 'Used for influencer partnership strategy, campaign planning, and measuring the actual impact of influencer activity on brand metrics.',
        ctaHeading: 'Find the influencers who actually matter',
        ctaBody: 'Ask about mapping the influencer landscape in your category.',
        ctaLabel: 'Discuss Influencer Insights',
        methodology: 'Influencers are scored on a combination of reach, audience relevance, and engagement quality, not follower count alone, to identify genuine category voices.',
        metaDescription: 'Influencer mapping and engagement analysis that identifies who actually drives conversation in your category.',
        keywords: 'influencer mapping, influencer marketing research, engagement analysis',
      },
    ],
  },
];

function slugifyTitle(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[()]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// /services listing redesign's photo category cards — reuses existing
// seed-assets/figma images already uploaded for other pages (uploadAsset()
// matches-and-skips by filename, so this adds no new files) rather than
// sourcing 8 new photos. Fit is thematic, not literal, for a couple of
// these (Research Support Functions, Social Media Intelligence) — there's
// no closer existing asset for them.
const PARENT_THUMBNAILS: Record<string, string> = {
  'Primary Research': 'blog-field-research.jpg',
  'Qualitative Research': 'moments-large.jpg',
  'Quantitative Research': 'industry-banking.jpg',
  'Business Research': 'services-earth.jpg',
  'Research Support Functions': 'industry-cityscape.jpg',
  'AI-Driven Analytics & Predictive Insights': 'blog-ai-workforce.jpg',
  'Comprehensive CX & Customer Journey Research': 'moments-small.jpg',
  'Social Media Intelligence & Sentiment Analysis': 'industry-retail.jpg',
};

async function upsertServiceHierarchy(strapi: any) {
  const seenSlugs = new Set<string>();
  let count = 0;

  for (const parentSeed of SERVICES_HIERARCHY) {
    const parentSlug = slugifyTitle(parentSeed.title);
    seenSlugs.add(parentSlug);

    const thumbnailFilename = PARENT_THUMBNAILS[parentSeed.title];
    // eslint-disable-next-line no-await-in-loop
    const thumbnailId = thumbnailFilename ? await uploadAsset(strapi, thumbnailFilename) : null;

    const parentDetailData = parentSeed.detail
      ? // eslint-disable-next-line no-await-in-loop -- must resolve before the upsert below, one service at a time for readable seed logs
        await resolveServiceDetailSeed(strapi, parentSeed.detail)
      : {};

    const parentEntry = await upsertBySlug(
      strapi,
      'api::service.service',
      parentSlug,
      {
        title: parentSeed.title,
        // Explicit, not left to `targetField` auto-generation — an
        // earlier seed attempt hit a null-slug validation error on create
        // relying on that.
        slug: parentSlug,
        summary: parentSeed.summary,
        thumbnail: thumbnailId,
        legacyUrl: parentSeed.legacyUrl ?? null,
        suggestedUrl: parentSeed.suggestedUrl ?? null,
        parent: null,
        seo: buildResearchSeo(parentSeed.title, parentSeed),
        ...parentDetailData,
      },
      true // published — fully content-enriched, per content-enrichment request
    );
    count += 1;

    for (const child of parentSeed.children ?? []) {
      let childSlug = slugifyTitle(child.title);
      if (seenSlugs.has(childSlug)) {
        // "Focus Group Discussions" appears under both Primary Research
        // and Qualitative Research — disambiguate deterministically by
        // prefixing with the parent's title rather than picking one.
        childSlug = slugifyTitle(`${parentSeed.title} ${child.title}`);
        strapi.log.warn(`[seed] Disambiguated duplicate service slug -> "${childSlug}"`);
      }
      seenSlugs.add(childSlug);

      // eslint-disable-next-line no-await-in-loop -- each child must fully commit before the next, for readable seed logs
      await upsertBySlug(
        strapi,
        'api::service.service',
        childSlug,
        {
          title: child.title,
          slug: childSlug,
          summary: child.summary,
          suggestedUrl: child.suggestedUrl ?? null,
          parent: parentEntry.documentId,
          seo: buildResearchSeo(child.title, child),
        },
        true // published
      );
      count += 1;
    }
  }

  strapi.log.info(`[seed] Service hierarchy: ${count} entries upserted and published (1 with the full node-474:5731 detail-page content, ${count - 1} base-fields-only) + SEO.`);
}

// ---------------------------------------------------------------------------
// 5. Cities — REMOVED entirely, along with `api::city.city` itself (see
// backend/src/api/... removal history) — the only feature that ever used
// cities was the demo city+service combo pages, which are gone too.
// ---------------------------------------------------------------------------
// 6. City-service overrides — REMOVED. The 3 rows that used to seed here
// all related to `web-development`, one of the 3 demo services removed
// above; there is no remaining service in the Google Sheet-migrated
// hierarchy meant to be combined with a city (the sheet has no such
// concept), so this section — and the demo city+service combo feature it
// backed — is gone rather than left pointing at deleted data. Cities
// themselves (section 5 below) are unrelated to this and stay.
// ---------------------------------------------------------------------------

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
// ---------------------------------------------------------------------------
// 8. Industries — flat collection (Google Sheet IA migration)
// ---------------------------------------------------------------------------

interface DetailLinkSeed {
  label: string;
  href: string;
  isExternal: boolean;
  variant: 'primary' | 'secondary' | 'ghost' | 'link';
}

interface DetailCardSeed {
  title: string;
  description?: string;
  imageFilename?: string;
  iconIdentifier?: string;
}

interface DetailIndustryItemSeed {
  title: string;
  imageFilename: string;
  accentColor?: string;
}

/**
 * The full node-384:6205 detail-page content, in the exact shape
 * `api::industry.industry`'s new attributes expect (media as filenames,
 * resolved to upload IDs by `resolveIndustryDetailSeed` below rather than
 * inline here, so this object stays plain data). Only "Automotives" uses
 * this — see `IndustrySeed.detail`'s comment.
 */
interface IndustryDetailSeed {
  heroEyebrow: string;
  heroHeading: string;
  heroSubheading: string;
  heroImageFilename: string;
  heroActions: DetailLinkSeed[];
  trustHeading: string;
  trustLogos: { name: string; imageFilename?: string }[];
  whatWeDoEyebrow: string;
  whatWeDoHeading: string;
  whatWeDoBody: string;
  whatWeDoCta: DetailLinkSeed;
  whatWeDoImageFilename: string;
  whyResearchEyebrow: string;
  whyResearchHeading: string;
  whyResearchCards: DetailCardSeed[];
  expertiseEyebrow: string;
  expertiseHeading: string;
  expertiseItems: DetailCardSeed[];
  challengesEyebrow: string;
  challengesHeading: string;
  challengesBody: string;
  challengesCards: DetailCardSeed[];
  whoWeServeEyebrow: string;
  whoWeServeHeading: string;
  whoWeServeCards: DetailCardSeed[];
  methodologiesEyebrow: string;
  methodologiesHeading: string;
  methodologiesBody: string;
  methodologies: DetailIndustryItemSeed[];
  empowerEyebrow: string;
  empowerHeading: string;
  empowerBody: string;
  empowerCta: DetailLinkSeed;
  empowerImageFilename: string;
  enquiryEyebrow: string;
  enquiryHeading: string;
  enquiryBody: string;
  enquiryImageFilename: string;
  faqItems: { question: string; answer: string }[];
  caseStudiesEyebrow: string;
  caseStudiesHeading: string;
  caseStudiesBody: string;
  caseStudiesCta: DetailLinkSeed;
  caseStudies: DetailIndustryItemSeed[];
  aboutEyebrow: string;
  aboutHeading: string;
  aboutBody: string;
}

const TALK_TO_EXPERTS: DetailLinkSeed = { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' };

/**
 * Every string below is copied verbatim from Figma node 384:6205
 * ("Automotives") — the FAQ answers are the one exception, authored in
 * the same voice as the rest of this file's FAQ content, since Figma's
 * accordion is collapsed on canvas and never exposes answer text (same
 * documented exception used for /blogs and /industries' own FAQs).
 * Images reuse the 16 files already downloaded from this same node into
 * scripts/seed-assets/figma/ — uploadAsset() skips re-uploading them.
 */
const AUTOMOTIVES_DETAIL: IndustryDetailSeed = {
  heroEyebrow: 'AUTOMOTIVE MARKET RESEARCH',
  heroHeading: 'Drive Innovation with Data-Driven Automotive Insights',
  heroSubheading:
    'Helping OEMs, automotive suppliers, EV manufacturers, mobility providers, and technology companies make smarter business decisions through reliable market intelligence.',
  heroImageFilename: 'automotive-plant.jpg',
  heroActions: [
    { label: 'Get a Custom Proposal', href: '/contact', isExternal: false, variant: 'primary' },
    { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' },
  ],
  trustHeading: 'Trusted by Automotive Leaders',
  trustLogos: [], // Figma shows real company wordmarks (e.g. "TATA MOTORS") as example imagery — not confirmed Unimrkt clients, left empty per instruction.
  whatWeDoEyebrow: 'What We Do',
  whatWeDoHeading: 'Our Automotive Research Services',
  whatWeDoBody:
    'Unimrkt Research is a trusted automotive market research partner, delivering reliable data and actionable insights to help manufacturers, OEMs, suppliers, dealerships, EV companies, and mobility providers make informed business decisions. Our expertise spans consumer behavior, market trends, competitive intelligence, product validation, and emerging opportunities across the automotive ecosystem. Using advanced research methodologies such as CATI, Online Surveys, In-Depth Interviews (IDIs), Focus Group Discussions (FGDs), and Telephonic Surveys, we provide high-quality, accurate data tailored to your business objectives.',
  whatWeDoCta: { label: 'Talk to Our B2B Research Experts', href: '/contact', isExternal: false, variant: 'primary' },
  whatWeDoImageFilename: 'content-research-services.jpg',
  whyResearchEyebrow: 'Why Automotive Research?',
  whyResearchHeading: 'Accelerate Growth with Industry Intelligence',
  whyResearchCards: [
    {
      title: 'Understand Customer Preferences',
      description: 'Identify buying behavior, ownership trends, EV adoption, and consumer expectations to create better products.',
      imageFilename: 'why-customer-preferences.jpg',
    },
    {
      title: 'Stay Ahead of Competitors',
      description: 'Benchmark pricing, new launches, emerging technologies, and market positioning with real-time competitive intelligence.',
      imageFilename: 'why-competitors.jpg',
    },
    {
      title: 'Improve Product Strategy',
      description: 'Validate concepts, evaluate demand, and reduce product launch risks with research-backed decision making.',
      imageFilename: 'why-product-strategy.jpg',
    },
  ],
  expertiseEyebrow: 'Our Expertise',
  expertiseHeading: 'Expertise Across the Automotive Ecosystem',
  expertiseItems: [
    { title: 'Mobility', iconIdentifier: 'mobility' },
    { title: 'Automobile Manufacturing', iconIdentifier: 'factory' },
    { title: 'Two-Wheeler & Three-Wheeler Vehicles', iconIdentifier: 'bike' },
    { title: 'Automobile Technology', iconIdentifier: 'cpu' },
    { title: 'Accessories', iconIdentifier: 'package' },
  ],
  challengesEyebrow: 'Business Challenges We Cover',
  challengesHeading: 'Key Challenges We Solve',
  challengesBody:
    'The automotive industry is rapidly evolving with technological advancements, changing consumer expectations, and increasing regulatory demands. Unimrkt Research helps businesses overcome these challenges through reliable market intelligence and actionable insights.',
  challengesCards: [
    { title: 'Consumer Preferences', description: 'Understand evolving buying behavior, ownership trends, and customer expectations.', iconIdentifier: 'profile-2user' },
    { title: 'EV & Future Mobility', description: 'Track electric vehicle adoption, charging infrastructure, and emerging mobility trends.', iconIdentifier: 'flash' },
    { title: 'Competitive Intelligence', description: 'Monitor competitors, pricing strategies, product launches, and market positioning.', iconIdentifier: 'chart' },
    { title: 'Regulatory & Market Dynamics', description: 'Stay informed about policy changes, sustainability initiatives, and industry developments.', iconIdentifier: 'shield-tick' },
  ],
  whoWeServeEyebrow: 'Who We Serve',
  whoWeServeHeading: 'Supporting Every Automotive Segment',
  whoWeServeCards: [
    { title: 'Automotive Manufacturers & OEMs', description: 'Helping manufacturers understand market trends, customer expectations, and product opportunities.', iconIdentifier: 'car' },
    { title: 'Auto Component Suppliers', description: 'Providing insights into demand forecasting, supply chains, and competitive positioning.', iconIdentifier: 'wrench' },
    { title: 'EV & Mobility Companies', description: 'Supporting electric vehicle brands, charging providers, and mobility innovators with future-focused research.', iconIdentifier: 'battery-charging' },
    { title: 'Dealerships, Fleet & Technology Companies', description: 'Helping dealerships, fleet operators, and mobility companies drive smarter decisions through actionable market insights.', iconIdentifier: 'building' },
  ],
  methodologiesEyebrow: 'Research Methodologies',
  methodologiesHeading: 'Proven Research Methodologies',
  methodologiesBody:
    'We combine qualitative and quantitative research methodologies to deliver accurate, reliable, and actionable automotive market insights tailored to your business objectives.',
  methodologies: [
    { title: 'CATI Surveys', imageFilename: 'method-cati.jpg', accentColor: '#7f3856' },
    { title: 'Online Surveys', imageFilename: 'method-online-surveys.jpg', accentColor: '#7f3856' },
    { title: 'In-Depth Interviews (IDIs)', imageFilename: 'method-idis.jpg', accentColor: '#7f3856' },
    { title: 'Focus Group Discussions (FGDs)', imageFilename: 'method-fgds.jpg', accentColor: '#7f3856' },
  ],
  empowerEyebrow: 'Automotive Research',
  empowerHeading: 'Empower Your Automotive Business with Unimrkt Research',
  empowerBody:
    'Unimrkt Research empowers automotive businesses with accurate market intelligence and actionable insights to support informed decision-making. Leveraging advanced research methodologies, experienced professionals, and access to niche automotive audiences, we deliver reliable data that helps organizations understand customer behavior, market trends, competitive landscapes, and emerging opportunities.',
  empowerCta: { label: 'Get Started with Unimrkt Research Today', href: '/contact', isExternal: false, variant: 'primary' },
  empowerImageFilename: 'content-mechanics.png',
  enquiryEyebrow: 'Get a Free Quote!',
  enquiryHeading: "Let's Discuss Your Research Needs",
  enquiryBody:
    'Connect with our research experts to design customized solutions that deliver accurate insights, support informed decisions, and drive measurable business growth across your target automotive markets.',
  enquiryImageFilename: 'enquiry-bg.jpg',
  faqItems: [
    {
      question: 'What is automobile market research, and why is it important?',
      answer:
        'Automobile market research is the systematic study of consumer behavior, competitive dynamics, and industry trends within the automotive sector. It matters because it gives manufacturers, suppliers, and mobility companies the evidence they need to make confident, lower-risk decisions.',
    },
    {
      question: 'Why is market research important for automobile industries?',
      answer:
        'It helps automotive businesses understand shifting customer expectations, benchmark against competitors, and validate new products before committing significant investment — reducing risk at every stage of the product lifecycle.',
    },
    {
      question: 'How can automobile market research help businesses innovate?',
      answer:
        'By surfacing unmet customer needs, emerging mobility trends, and gaps in the competitive landscape, research gives product and strategy teams a data-driven foundation to prioritize the innovations most likely to succeed.',
    },
    {
      question: 'How to conduct effective automotive market research?',
      answer:
        'Effective automotive research combines the right methodology — CATI, online surveys, IDIs, or FGDs — with a well-defined sample, clear objectives, and experienced analysts who understand the sector’s regulatory and technology landscape.',
    },
    {
      question: 'What methodologies does Unimrkt Research use for automotive market research?',
      answer:
        'We use CATI Surveys, Online Surveys, In-Depth Interviews (IDIs), Focus Group Discussions (FGDs), and Telephonic Surveys — selecting the right mix based on your audience and research objectives.',
    },
    {
      question: 'How can market research help automobile industry companies remain competitive?',
      answer:
        'Ongoing research keeps businesses ahead of pricing shifts, new product launches, and changing regulations, so decisions are grounded in current market reality rather than assumption.',
    },
    {
      question: 'What are the key areas covered by Unimrkt Research in automotive market research?',
      answer:
        'We cover consumer behavior and preferences, competitive intelligence, product validation, EV and future mobility trends, and regulatory and market dynamics across the automotive ecosystem.',
    },
  ],
  caseStudiesEyebrow: 'Case Studies',
  caseStudiesHeading: 'Automotive Success Stories',
  caseStudiesBody:
    'Discover how our research empowers automotive brands with actionable insights, smarter decisions, and measurable business growth.',
  caseStudiesCta: TALK_TO_EXPERTS,
  caseStudies: [
    { title: 'Vehicle Product Acceptance Study Through Car Clinics', imageFilename: 'case-vehicle-clinics.jpg' },
    { title: 'Future Mobility & Car Design Preference Research', imageFilename: 'case-future-mobility.jpg' },
  ],
  aboutEyebrow: 'About Our Automotive Research',
  aboutHeading: 'Driving Innovation with Automotive Market Intelligence',
  aboutBody:
    'The automotive industry is evolving rapidly with the rise of electric vehicles, connected mobility, autonomous technologies, and changing consumer expectations. At Unimrkt Research, we provide comprehensive automotive market research that helps manufacturers, OEMs, suppliers, dealerships, EV companies, and mobility providers make informed, data-driven decisions.\n\nLeveraging advanced research methodologies and deep industry expertise, we deliver actionable insights into consumer behavior, market trends, competitive landscapes, product innovation, and emerging opportunities. Our customized research solutions empower automotive businesses to reduce risk, accelerate innovation, and achieve sustainable growth in an increasingly competitive global market.',
};

/** Resolves every `*Filename` reference in an `IndustryDetailSeed` to an
 * uploaded media ID via `uploadAsset()`, returning the flat attributes
 * object ready to spread into the `upsertBySlug()` data payload. */
async function resolveIndustryDetailSeed(strapi: any, detail: IndustryDetailSeed) {
  const heroImage = await uploadAsset(strapi, detail.heroImageFilename);
  const whatWeDoImage = await uploadAsset(strapi, detail.whatWeDoImageFilename);
  const empowerImage = await uploadAsset(strapi, detail.empowerImageFilename);
  const enquiryImage = await uploadAsset(strapi, detail.enquiryImageFilename);

  const whyResearchCards = [];
  for (const card of detail.whyResearchCards) {
    whyResearchCards.push({ title: card.title, description: card.description, image: card.imageFilename ? await uploadAsset(strapi, card.imageFilename) : null });
  }
  const methodologies = [];
  for (const item of detail.methodologies) {
    methodologies.push({ title: item.title, accentColor: item.accentColor, image: await uploadAsset(strapi, item.imageFilename) });
  }
  const caseStudies = [];
  for (const item of detail.caseStudies) {
    caseStudies.push({ title: item.title, image: await uploadAsset(strapi, item.imageFilename) });
  }

  return {
    heroEyebrow: detail.heroEyebrow,
    heroHeading: detail.heroHeading,
    heroSubheading: detail.heroSubheading,
    heroImage,
    heroActions: detail.heroActions,
    trustHeading: detail.trustHeading,
    trustLogos: detail.trustLogos,
    whatWeDoEyebrow: detail.whatWeDoEyebrow,
    whatWeDoHeading: detail.whatWeDoHeading,
    whatWeDoBody: detail.whatWeDoBody,
    whatWeDoCta: detail.whatWeDoCta,
    whatWeDoImage,
    whyResearchEyebrow: detail.whyResearchEyebrow,
    whyResearchHeading: detail.whyResearchHeading,
    whyResearchCards,
    expertiseEyebrow: detail.expertiseEyebrow,
    expertiseHeading: detail.expertiseHeading,
    expertiseItems: detail.expertiseItems,
    challengesEyebrow: detail.challengesEyebrow,
    challengesHeading: detail.challengesHeading,
    challengesBody: detail.challengesBody,
    challengesCards: detail.challengesCards,
    whoWeServeEyebrow: detail.whoWeServeEyebrow,
    whoWeServeHeading: detail.whoWeServeHeading,
    whoWeServeCards: detail.whoWeServeCards,
    methodologiesEyebrow: detail.methodologiesEyebrow,
    methodologiesHeading: detail.methodologiesHeading,
    methodologiesBody: detail.methodologiesBody,
    methodologies,
    empowerEyebrow: detail.empowerEyebrow,
    empowerHeading: detail.empowerHeading,
    empowerBody: detail.empowerBody,
    empowerCta: detail.empowerCta,
    empowerImage,
    enquiryEyebrow: detail.enquiryEyebrow,
    enquiryHeading: detail.enquiryHeading,
    enquiryBody: detail.enquiryBody,
    enquiryImage,
    faqItems: detail.faqItems,
    caseStudiesEyebrow: detail.caseStudiesEyebrow,
    caseStudiesHeading: detail.caseStudiesHeading,
    caseStudiesBody: detail.caseStudiesBody,
    caseStudiesCta: detail.caseStudiesCta,
    caseStudies,
    aboutEyebrow: detail.aboutEyebrow,
    aboutHeading: detail.aboutHeading,
    aboutBody: detail.aboutBody,
  };
}

interface IndustrySeed {
  title: string;
  legacyUrl?: string;
  suggestedUrl: string;
  summary: string;
  metaDescription: string;
  keywords: string;
  /** Only "Automotives" carries this — the rich, node-384:6205-derived
   * detail-page content. Every other industry stays base-fields-only, so
   * every section below renders nothing on its page (rule: missing data
   * -> null, never a hardcoded fallback). */
  detail?: IndustryDetailSeed;
}

const INDUSTRIES_SEED: IndustrySeed[] = [
  {
    title: 'Automotives',
    suggestedUrl: 'https://www.unimrkt.com/industries/automotive-market-research.php',
    summary: 'Our Automotive research helps OEMs, dealers, and suppliers understand shifting buyer preferences — from EV adoption and connected-car features to dealership experience and total cost of ownership perceptions.',
    metaDescription: 'Automotive market research covering EV adoption, dealer experience, and connected-vehicle feature preferences.',
    keywords: 'automotive market research, EV research, dealer experience, automotive industry insights',
    detail: AUTOMOTIVES_DETAIL,
  },
  {
    title: 'Chemicals',
    suggestedUrl: 'https://www.unimrkt.com/industries/chemicals-market-research.php',
    summary: 'Our Chemicals industry research supports B2B demand forecasting, customer satisfaction, and go-to-market decisions for specialty and commodity chemical producers navigating shifting regulation and end-market demand.',
    metaDescription: 'Chemicals industry market research — demand sizing, customer satisfaction, and go-to-market insight for B2B producers.',
    keywords: 'chemicals market research, B2B research, specialty chemicals, industrial research',
  },
  {
    title: 'Energy & Utilities',
    suggestedUrl: 'https://www.unimrkt.com/industries/energy-and-utilities-market-research.php',
    summary: 'Our Energy & Utilities research helps providers understand customer satisfaction, renewable-adoption attitudes, and regulatory-stakeholder perceptions across residential and commercial segments.',
    metaDescription: 'Energy and utilities market research — customer satisfaction, renewable adoption, and regulatory stakeholder studies.',
    keywords: 'energy market research, utilities research, renewable adoption research',
  },
  {
    title: 'Banking and Finance',
    suggestedUrl: 'https://www.unimrkt.com/industries/banking-and-finance-market-research.php',
    summary: 'Our Banking and Finance research covers digital banking adoption, customer satisfaction, and product concept testing for retail and commercial banks navigating fintech disruption.',
    metaDescription: 'Banking and finance market research — digital adoption, satisfaction tracking, and product concept testing.',
    keywords: 'banking market research, financial services research, digital banking research',
  },
  {
    title: 'Food & Beverage',
    suggestedUrl: 'https://www.unimrkt.com/industries/food-and-beverage-market-research.php',
    summary: 'Our Food & Beverage research supports product development, packaging testing, and concept validation for CPG brands navigating shifting consumer taste and health preferences.',
    metaDescription: 'Food and beverage market research — product testing, packaging studies, and consumer trend tracking for CPG brands.',
    keywords: 'food and beverage research, CPG research, product testing, taste testing',
  },
  {
    title: 'Life Sciences & Healthcare',
    suggestedUrl: 'https://www.unimrkt.com/industries/life-sciences-and-healthcare-market-research.php',
    summary: 'Our Life Sciences & Healthcare research supports pharma, medtech, and provider organizations with patient experience studies, physician research, and market access insight — conducted to strict compliance standards.',
    metaDescription: 'Life sciences and healthcare market research — patient experience, physician insight, and market access studies.',
    keywords: 'healthcare market research, life sciences research, patient experience research, pharma research',
  },
  {
    title: 'IT & Telecom',
    suggestedUrl: 'https://www.unimrkt.com/industries/it-and-telecome-market-research.php',
    summary: 'Our IT & Telecom research helps operators and technology vendors understand customer churn drivers, network experience perceptions, and enterprise buyer decision journeys.',
    metaDescription: 'IT and telecom market research — churn analysis, network experience tracking, and enterprise buyer research.',
    keywords: 'telecom market research, IT research, churn analysis, enterprise technology research',
  },
  {
    title: 'Media & Entertainment',
    // Only industry row with a real (non-"NA") legacy URL in the sheet.
    legacyUrl: 'https://www.unimrkt.com/industries/media-and-entertainment.php',
    suggestedUrl: 'https://www.unimrkt.com/industries/media-and-entertainment-market-research.php',
    summary: 'Our Media & Entertainment research helps studios, platforms, and publishers understand content engagement, subscription behavior, and audience segmentation across a fragmenting media landscape.',
    metaDescription: 'Media and entertainment market research — content testing, subscription research, and audience segmentation.',
    keywords: 'media research, entertainment market research, audience segmentation, content testing',
  },
  {
    title: 'Metals and Mining',
    suggestedUrl: 'https://www.unimrkt.com/industries/metals-and-mining-market-research.php',
    summary: 'Our Metals and Mining research supports demand forecasting, stakeholder engagement, and community-impact studies for producers navigating volatile commodity markets and rising ESG scrutiny.',
    metaDescription: 'Metals and mining market research — demand forecasting, community engagement, and ESG stakeholder studies.',
    keywords: 'mining market research, metals industry research, ESG research, commodity research',
  },
  {
    title: 'Retail & CPG',
    suggestedUrl: 'https://www.unimrkt.com/industries/retail-and-cpg-market-research.php',
    summary: 'Our Retail & CPG research covers shopper behavior, planogram and pricing testing, and brand tracking for retailers and consumer goods manufacturers competing for shelf space and share of wallet.',
    metaDescription: 'Retail and CPG market research — shopper behavior, pricing testing, and brand tracking studies.',
    keywords: 'retail market research, CPG research, shopper research, brand tracking',
  },
  {
    title: 'Transportation',
    suggestedUrl: 'https://www.unimrkt.com/industries/transportation-market-research.php',
    summary: 'Our Transportation research supports logistics providers, airlines, and public transit agencies with customer satisfaction, service-quality, and demand-forecasting studies.',
    metaDescription: 'Transportation industry market research — rider satisfaction, service benchmarking, and demand forecasting studies.',
    keywords: 'transportation market research, logistics research, transit research',
  },
  {
    title: 'Professional & Business Services',
    suggestedUrl: 'https://www.unimrkt.com/industries/professional-and-business-services-market-research.php',
    summary: 'Our Professional & Business Services research helps consulting, legal, and B2B service firms understand client satisfaction, win/loss dynamics, and brand perception among decision-makers.',
    metaDescription: 'Professional and business services market research — client satisfaction, win/loss analysis, and brand perception studies.',
    keywords: 'professional services research, B2B research, win loss analysis, client satisfaction research',
  },
  {
    title: 'Education',
    suggestedUrl: 'https://www.unimrkt.com/industries/education.php',
    summary: 'Our Education research supports institutions and edtech providers with student experience studies, enrollment/demand research, and learning-outcome perception surveys.',
    metaDescription: 'Education market research — student experience, enrollment research, and edtech usability studies.',
    keywords: 'education market research, edtech research, student experience research',
  },
  {
    title: 'Fintech',
    suggestedUrl: 'https://www.unimrkt.com/industries/fintech-market-research.php',
    summary: 'Our Fintech research helps digital-first financial products understand user onboarding friction, feature adoption, and trust perceptions in a category where switching costs are low and competition is high.',
    metaDescription: 'Fintech market research — onboarding, feature adoption, and trust perception studies for digital financial products.',
    keywords: 'fintech research, digital banking research, user onboarding research',
  },
  {
    title: 'Oil & Gas',
    suggestedUrl: 'https://www.unimrkt.com/industries/oil-and-gas-market-research.php',
    summary: 'Our Oil & Gas research supports upstream, midstream, and downstream players with market demand studies, stakeholder engagement, and workforce/safety-culture research.',
    metaDescription: 'Oil and gas market research — demand forecasting, stakeholder engagement, and workforce safety-culture studies.',
    keywords: 'oil and gas market research, energy sector research, workforce research',
  },
  {
    title: 'Real Estate',
    suggestedUrl: 'https://www.unimrkt.com/industries/real-estate-market-research.php',
    summary: 'Our Real Estate research helps developers, brokerages, and property managers understand buyer/renter preferences, amenity valuation, and market demand across residential and commercial segments.',
    metaDescription: 'Real estate market research — buyer and renter preferences, amenity valuation, and market demand studies.',
    keywords: 'real estate market research, property research, amenity research',
  },
  {
    title: 'Travel & Tourism',
    suggestedUrl: 'https://www.unimrkt.com/industries/travel-and-tourism-market-research.php',
    summary: 'Our Travel & Tourism research helps airlines, hotels, and destinations understand traveler decision journeys, satisfaction drivers, and destination perception in a highly seasonal, experience-driven category.',
    metaDescription: 'Travel and tourism market research — traveler journey, satisfaction tracking, and destination perception studies.',
    keywords: 'travel market research, tourism research, destination research, guest satisfaction research',
  },
  {
    title: 'Manufacturing',
    suggestedUrl: 'https://www.unimrkt.com/industries/manufacturing-market-research.php',
    summary: 'Our Manufacturing research supports industrial and consumer-goods manufacturers with B2B customer satisfaction, supply-chain stakeholder research, and product demand forecasting.',
    metaDescription: 'Manufacturing market research — B2B customer satisfaction, channel research, and demand forecasting studies.',
    keywords: 'manufacturing market research, industrial research, B2B demand research',
  },
  {
    title: 'Architecture & Construction',
    suggestedUrl: 'https://www.unimrkt.com/industries/architecture-and-construction-market-research.php',
    summary: 'Our Architecture & Construction research helps firms and material suppliers understand client satisfaction, specification decision drivers, and demand trends across residential and commercial building.',
    metaDescription: 'Architecture and construction market research — specification research, client satisfaction, and demand studies.',
    keywords: 'construction market research, architecture research, building materials research',
  },
  {
    title: 'Sports',
    suggestedUrl: 'https://www.unimrkt.com/industries/sports-market-research.php',
    summary: 'Our Sports research helps leagues, teams, and sponsors understand fan engagement, sponsorship value, and viewership behavior across an increasingly fragmented media landscape.',
    metaDescription: 'Sports market research — fan engagement, sponsorship valuation, and viewership behavior studies.',
    keywords: 'sports market research, fan engagement research, sponsorship research',
  },
  {
    title: 'E-commerce & Online Marketplaces Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/ecommerce-market-research.php',
    summary: 'Our E-commerce & Online Marketplaces research helps online retailers and platforms understand conversion funnel drop-off, seller/buyer trust dynamics, and competitive positioning in a fast-moving category.',
    metaDescription: 'E-commerce and online marketplace research — conversion optimization, trust studies, and competitive benchmarking.',
    keywords: 'e-commerce market research, online marketplace research, conversion research',
  },
  {
    title: 'Agriculture & Agritech Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/agriculture-and-agritech-market-research.php',
    summary: 'Our Agriculture & Agritech research helps input suppliers, equipment makers, and agritech startups understand farmer decision-making, technology adoption barriers, and market demand across diverse farming segments.',
    metaDescription: 'Agriculture and agritech market research — farmer decision-making, technology adoption, and demand studies.',
    keywords: 'agriculture market research, agritech research, farmer research',
  },
  {
    title: 'Fashion & Textile Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/fashion-and-textile-market-research.php',
    summary: 'Our Fashion & Textile research helps brands and manufacturers understand consumer style preferences, sustainability attitudes, and pricing sensitivity across a fast-cycling category.',
    metaDescription: 'Fashion and textile market research — trend testing, sustainability attitudes, and pricing sensitivity studies.',
    keywords: 'fashion market research, textile research, trend testing, sustainability research',
  },
  {
    title: 'AeroSpace and Defence Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/aerospace-defence-market-research.php',
    summary: 'Our Aerospace and Defence research supports manufacturers and suppliers with stakeholder engagement, procurement decision research, and market demand analysis in a highly regulated, long-cycle industry.',
    metaDescription: 'Aerospace and defence market research — procurement decisions, stakeholder engagement, and demand studies.',
    keywords: 'aerospace market research, defence industry research, procurement research',
  },
  {
    title: 'Insurance Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/insurance-market-research.php',
    summary: 'Our Insurance research helps carriers and brokers understand policyholder satisfaction, claims-experience perception, and product demand across life, health, and property & casualty lines.',
    metaDescription: 'Insurance market research — policyholder satisfaction, claims experience, and product concept testing.',
    keywords: 'insurance market research, policyholder research, claims experience research',
  },
  {
    title: 'Legal Services Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/legal-services-market-research.php',
    summary: 'Our Legal Services research helps law firms and legal-tech providers understand client satisfaction, competitive positioning, and legal-tech adoption among corporate and individual clients.',
    metaDescription: 'Legal services market research — client satisfaction, win/loss analysis, and legal-tech adoption studies.',
    keywords: 'legal services research, law firm research, legal tech research',
  },
  {
    // Sheet typo "FMCG Market Rsearch" corrected here.
    title: 'FMCG Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/fmcg-market-research.php',
    summary: 'Our FMCG research helps consumer packaged goods brands validate product concepts, test packaging, and track brand health in one of the most competitive, fast-cycling categories in consumer research.',
    metaDescription: 'FMCG market research — concept testing, packaging studies, and brand health tracking for consumer goods brands.',
    keywords: 'FMCG market research, consumer goods research, concept testing, brand tracking',
  },
];

async function upsertIndustries(strapi: any) {
  for (const industry of INDUSTRIES_SEED) {
    const slug = slugifyTitle(industry.title);
    const detailData = industry.detail
      ? // eslint-disable-next-line no-await-in-loop -- must resolve before the upsert below, one industry at a time for readable seed logs
        await resolveIndustryDetailSeed(strapi, industry.detail)
      : {};
    // eslint-disable-next-line no-await-in-loop -- each industry must fully commit before the next, for readable seed logs
    await upsertBySlug(
      strapi,
      'api::industry.industry',
      slug,
      {
        title: industry.title,
        slug,
        legacyUrl: industry.legacyUrl ?? null,
        suggestedUrl: industry.suggestedUrl,
        summary: industry.summary,
        seo: {
          metaTitle: `${industry.title.length > 46 ? `${industry.title.slice(0, 45)}…` : industry.title} | Unimrkt Research`,
          metaDescription: industry.metaDescription,
          keywords: industry.keywords,
        },
        ...detailData,
      },
      true // published — fully content-enriched, per content-enrichment request
    );
  }

  strapi.log.info(
    `[seed] Industries: ${INDUSTRIES_SEED.length} upserted and published (1 with the full node-384:6205 detail-page content, ${INDUSTRIES_SEED.length - 1} base-fields-only). Corrected sheet typo: "FMCG Market Rsearch" -> "FMCG Market Research".`
  );
}

// ---------------------------------------------------------------------------
// 9. About US / Contact US sub-pages — modeled as ordinary `page` entries,
// not a new content type.
//
// IMPORTANT — verified against the actual frontend/backend code (not
// assumed): `page.slug` is a Strapi `uid` field, which does NOT accept "/"
// characters, and the catch-all route's own doc comment confirms it
// "resolves by the URL's *last* segment" — i.e. it looks up a page by a
// FLAT slug regardless of how many path segments preceded it in the URL.
// So `/about-us/our-company` and `/contact-us/write-to-us` both resolve
// correctly with plain single-segment slugs below; a *different* prefix
// in front of the same last segment would also incorrectly resolve to the
// same page, but that's existing catch-all behavior, not something this
// migration introduces or should silently "fix".
//
// All published immediately — the sheet's "Content Created" column
// doesn't cover this group at all.
// ---------------------------------------------------------------------------

interface AboutContactPageSeed extends ResearchContent {
  slug: string;
  title: string;
}

// `our-company` used to be seeded here as a generic 5-block
// Google-Sheet-migration sub-page (hero/stats/content/cta/methodology,
// none of it from Figma). It's been replaced by a dedicated page —
// see upsertOurCompanyPageSettings() / api::our-company-page, built
// from the real Figma node 617:7561 ("Our Company", file
// foaJFuv0vRX8nD43o0ylgB), not this generic template. The stale
// `page.page` row is deleted in main() so no orphaned CMS entry or
// route ambiguity remains.
const ABOUT_CONTACT_SUBPAGES: AboutContactPageSeed[] = [
  {
    slug: 'why-choose-us',
    title: 'Why Choose Us',
    summary: 'Clients choose Unimrkt Research for a combination of methodological rigor, genuine category expertise, and a client-partnership model that goes beyond simply delivering a report — we help you act on what the data says.',
    overview: 'Our differentiation comes down to three things: a documented, defensible methodology behind every study; researchers who specialize in your category rather than generalists; and a delivery model built around your actual decision timeline, not a standard template.',
    stats: [['98%', 'Client satisfaction rate'], ['85%+', 'Repeat client rate'], ['15+', 'Industries of deep expertise'], ['24-48 hr', 'Typical response time']],
    useCases: 'Whether you need a single decisive study or an ongoing insights partnership, our model scales from fixed-scope projects to embedded, always-on research support.',
    ctaHeading: 'See the difference for yourself',
    ctaBody: 'Talk to our team about your next research need.',
    ctaLabel: 'Talk to Our Team',
    methodology: 'Every engagement includes a documented methodology, a named research lead, and a quality-assurance review before any deliverable reaches you.',
    metaDescription: 'Discover why organizations choose Unimrkt Research — rigorous methodology, category expertise, and a genuine research partnership.',
    keywords: 'why choose unimrkt research, market research partner, research quality',
  },
  {
    slug: 'our-approach',
    title: 'Our Approach',
    summary: 'Our Approach combines rigorous methodology with genuine partnership — we start by understanding your actual business decision, then design the research that will best inform it, rather than starting from a standard template.',
    overview: 'Every engagement begins with a scoping conversation to align on the specific decision our research needs to support, followed by a methodology recommendation tailored to your timeline, budget, and confidence requirements. We stay engaged through fieldwork, analysis, and the final decision-support conversation.',
    stats: [['4-step', 'Structured process'], ['Named lead', 'On every project'], ['Every engagement', 'Documented methodology'], ['Included', 'Post-delivery support']],
    useCases: 'Our approach flexes across ad-hoc studies, ongoing tracking programs, and embedded research partnerships, always anchored to the business decision at hand.',
    ctaHeading: 'Learn more about how we work',
    ctaBody: 'Talk to us about the right approach for your next project.',
    ctaLabel: 'Discuss Your Project',
    methodology: 'Our four-step process — scope, design, field, deliver — is documented for every engagement, with a quality checkpoint at each stage before moving to the next.',
    metaDescription: "Discover Unimrkt Research's approach to market research — from scoping to delivery, built around your actual business decision.",
    keywords: 'unimrkt research approach, research methodology, research process',
  },
  {
    slug: 'team-unimrkt',
    title: 'Team Unimrkt',
    summary: 'Team Unimrkt brings together research directors, data scientists, and fieldwork specialists with deep category expertise across consumer, B2B, healthcare, and public-sector research.',
    overview: 'Our team is organized around category expertise rather than generic research skills — each research director specializes in specific industries, supported by dedicated data science, qualitative, and fieldwork operations teams working together on every engagement.',
    stats: [['200+', 'Research professionals'], ['15+', 'Industry specializations'], ['20+', 'Languages spoken in-house'], ['90+', 'Countries with local research support']],
    useCases: 'Our team structure supports everything from a single focused study to a global, multi-market research program requiring coordinated local expertise.',
    ctaHeading: 'Meet the team behind your research',
    ctaBody: 'Get in touch to learn more about who would lead your project.',
    ctaLabel: 'Contact Our Team',
    methodology: 'Every project is staffed with a named research director and a supporting team matched to your category and research method, not a generic account handler.',
    metaDescription: 'Meet Team Unimrkt — research directors, data scientists, and fieldwork specialists with deep category expertise.',
    keywords: 'unimrkt research team, research professionals, research directors',
  },
  {
    slug: 'global-panel',
    title: 'Global Panel',
    summary: 'Our Global Panel gives clients direct access to pre-recruited, profiled respondents across 90+ countries, powering fast, high-quality quantitative research at global scale.',
    overview: 'Panelists are recruited and profiled across hundreds of demographic and behavioral attributes, continuously refreshed and validated to guard against professional-respondent bias — the same panel infrastructure that powers our Quantitative Research practice.',
    stats: [['90+', 'Countries covered'], ['500K+', 'Active profiled panelists'], ['300+', 'Profiling attributes'], ['<48 hr', 'Typical multi-market fielding']],
    useCases: 'Used for global tracking studies, multi-country concept tests, and any project needing fast, consistent fielding across markets.',
    ctaHeading: 'Check feasibility for your target markets',
    ctaBody: 'Ask about panel feasibility and cost for your project.',
    ctaLabel: 'Check Panel Feasibility',
    methodology: 'Panel quality is maintained through continuous validation — digital fingerprinting, attention-check questions, and regular re-profiling.',
    metaDescription: "Explore Unimrkt Research's Global Panel — profiled respondents across 90+ countries for fast, high-quality research.",
    keywords: 'global panel, unimrkt research panel, online panel, international research',
  },
  {
    slug: 'write-to-us',
    title: 'Write to us',
    summary: 'Write to us to start a conversation about your next research project — our team typically responds within one business day with next steps or a scoping call.',
    overview: "Whether you have a fully scoped brief or just a business question you're trying to answer, our team can help translate it into the right research approach. Reach out with as much or as little detail as you have.",
    stats: [['24-48 hr', 'Typical response time'], ['Global', 'Team available across time zones'], ['No obligation', 'Initial scoping conversation'], ['Free', 'Feasibility and cost estimates']],
    useCases: 'Use this channel for new project inquiries, questions about our services, or to request a proposal for an upcoming study.',
    ctaHeading: 'Ready to start the conversation?',
    ctaBody: "Send us a message and we'll get back to you within one business day.",
    ctaLabel: 'Send a Message',
    methodology: 'Every inquiry is routed to a research lead with relevant category expertise, who will follow up directly rather than through a generic sales queue.',
    metaDescription: 'Contact Unimrkt Research to discuss your next market research project — we typically respond within one business day.',
    keywords: 'contact unimrkt research, write to us, research inquiry',
  },
];

// `work-with-us` used to be seeded above as a generic 5-block Google
// -Sheet-migration sub-page. It's been replaced by a dedicated page —
// see upsertWorkWithUsPageSettings() / api::work-with-us-page, built
// from the real Figma node 924:23216 ("Work With Us", file
// foaJFuv0vRX8nD43o0ylgB), not that generic template. The stale
// `page.page` row is deleted in main() so no orphaned CMS entry or
// route ambiguity remains — same convention as deleteStaleOurCompanyGenericPage().

async function upsertAboutContactSubpages(strapi: any) {
  for (const page of ABOUT_CONTACT_SUBPAGES) {
    // eslint-disable-next-line no-await-in-loop
    await upsertBySlug(strapi, 'api::page.page', page.slug, {
      title: page.title,
      slug: page.slug,
      blocks: buildResearchBlocks(page.title, page),
      seo: buildResearchSeo(page.title, page),
    });
  }
  strapi.log.info(`[seed] About/Contact sub-pages: ${ABOUT_CONTACT_SUBPAGES.length} upserted and published, each with 5 content blocks + SEO.`);
}

// ---------------------------------------------------------------------------
// 10. Gallery Items — /gallery page migration off its static
//     Frontend/fixtures/gallery.json fixture. Natural key: `title` (no
//     slug field on this content type — the frontend always fetches the
//     whole collection in one request, so there's nothing a slug-based
//     single-entry lookup would be for).
// ---------------------------------------------------------------------------

interface GalleryItemSeed {
  title: string;
  category: string;
  imageFilename: string;
  order: number;
}

const GALLERY_ITEMS_SEED: GalleryItemSeed[] = [
  { title: 'Unimrkt Research team collaborating in the office', category: 'Team & Culture', imageFilename: 'gallery-item-01.jpg', order: 0 },
  { title: 'Analysts reviewing survey data on screen', category: 'Research Process', imageFilename: 'gallery-item-02.jpg', order: 1 },
  { title: 'Field researcher conducting an on-site interview', category: 'Field Work', imageFilename: 'gallery-item-03.jpg', order: 2 },
  { title: 'Client meeting to discuss research findings', category: 'Client Interactions', imageFilename: 'gallery-item-04.jpg', order: 3 },
  { title: 'Team members presenting at an industry conference', category: 'Events & Conferences', imageFilename: 'gallery-item-05.jpg', order: 4 },
  { title: 'Researchers brainstorming around a whiteboard', category: 'Team & Culture', imageFilename: 'gallery-item-06.jpg', order: 5 },
  { title: 'Data collection in the field with a tablet', category: 'Field Work', imageFilename: 'gallery-item-07.jpg', order: 6 },
  { title: 'Client workshop reviewing market insights together', category: 'Client Interactions', imageFilename: 'gallery-item-08.jpg', order: 7 },
  { title: 'Unimrkt Research booth at a research conference', category: 'Events & Conferences', imageFilename: 'gallery-item-09.jpg', order: 8 },
];

async function upsertGalleryItems(strapi: any) {
  const uid = 'api::gallery-item.gallery-item';
  for (const item of GALLERY_ITEMS_SEED) {
    // eslint-disable-next-line no-await-in-loop
    const imageId = await uploadAsset(strapi, item.imageFilename);
    // eslint-disable-next-line no-await-in-loop
    const existing = await strapi.documents(uid).findFirst({ filters: { title: item.title } });
    const data = {
      title: item.title,
      category: item.category,
      image: imageId,
      order: item.order,
    };
    // eslint-disable-next-line no-await-in-loop
    const doc = existing
      ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
      : await strapi.documents(uid).create({ data });
    // eslint-disable-next-line no-await-in-loop
    await strapi.documents(uid).publish({ documentId: doc.documentId });
  }
  strapi.log.info(`[seed] Gallery items: ${GALLERY_ITEMS_SEED.length} upserted, published, and image-linked.`);
}

// ---------------------------------------------------------------------------
// 10.4. Blog Categories — used to be a fixed 5-value enum directly on
//       `api::blog.blog`. Now a real collection type
//       (`api::category.category`) so an editor can create/edit/link
//       categories from the Admin panel with no code change. The 5 names
//       and their Figma-shown short filter-tab labels below are
//       transcribed verbatim from the enum they replace (BlogGridSection
//       used to hardcode this exact name -> short-label mapping — see
//       that component's own comment for why "Qualitative Research" and
//       "Quantitative Research" get a shorter tab label but every other
//       category doesn't) — nothing here is a new/invented category.
// ---------------------------------------------------------------------------

const BLOG_CATEGORIES_SEED: Array<{ name: string; shortLabel?: string }> = [
  { name: 'Primary Research' },
  { name: 'Qualitative Research', shortLabel: 'Qualitative' },
  { name: 'Quantitative Research', shortLabel: 'Quantitative' },
  { name: 'Business Research' },
  { name: 'Research Support Functions' },
];

/** Upserts every seed category by its natural key (`name`) and returns a
 * `name -> documentId` map so upsertBlogs() can wire each post's
 * `category` relation without a second lookup per post. */
async function upsertCategories(strapi: any): Promise<Record<string, string>> {
  const uid = 'api::category.category';
  const idsByName: Record<string, string> = {};

  for (const category of BLOG_CATEGORIES_SEED) {
    const slug = slugifyTitle(category.name);
    // eslint-disable-next-line no-await-in-loop -- each category must fully commit before the next, for readable seed logs
    const doc = await upsertBySlug(strapi, uid, slug, {
      name: category.name,
      slug,
      shortLabel: category.shortLabel ?? null,
    });
    idsByName[category.name] = doc.documentId;
  }

  strapi.log.info(`[seed] Blog categories: ${BLOG_CATEGORIES_SEED.length} upserted and published.`);
  return idsByName;
}

// ---------------------------------------------------------------------------
// 10.5. Blog posts (/blogs page, Figma node 522:4719) — 9 grid posts plus one
//       extra ("Exploring Market Trends") exclusive to the large gradient
//       "Latest Blogs" featured slot, which the design shows with no cover
//       photo at all (a decorative gradient + texture overlay only) — so it
//       seeds with `coverImageKey: null`. The frontend's "Latest Blogs" strip
//       picks its 3 small cards from whichever posts are next-most-recent
//       after that one, straight out of this same pool — no separate
//       "featured" flag or duplicate entries needed. Titles/excerpts below
//       are copied verbatim from the node (excerpts expanded past the
//       card's truncated "..." for a real sentence; the card UI itself
//       clamps to 2 lines). `category` here is still the literal string
//       from the node/enum this replaces — upsertBlogs() resolves it to
//       the matching Category's documentId via the map upsertCategories()
//       returns, so this array itself never needs to know about relations.
// ---------------------------------------------------------------------------

// Strapi Blocks (structured rich text) node builders — kept minimal, just
// the node shapes the /blogs/[slug] RichContent renderer (Figma node
// 587:3338) actually handles: paragraph, heading, unordered list, quote.
function p(text: string) {
  return { type: 'paragraph', children: [{ type: 'text', text }] };
}
function h2(text: string) {
  return { type: 'heading', level: 2, children: [{ type: 'text', text }] };
}
function ul(items: string[]) {
  return {
    type: 'list',
    format: 'unordered',
    children: items.map((text) => ({ type: 'list-item', children: [{ type: 'text', text }] })),
  };
}
function quote(text: string) {
  return { type: 'quote', children: [{ type: 'text', text }] };
}

const BLOG_POSTS_SEED: Array<{
  title: string;
  excerpt: string;
  category: 'Primary Research' | 'Qualitative Research' | 'Quantitative Research' | 'Business Research' | 'Research Support Functions';
  coverImageKey: keyof typeof IMAGE_FILENAMES | null;
  // 0 = most recent ("Latest Blogs" featured slot), ascending from there —
  // the same explicit-integer ordering `gallery-item.order` already uses,
  // rather than sorting on `publishedAt` (every post here gets published
  // in the same seed run, so real publish timestamps would land in upload
  // order, not editorial order).
  order: number;
  body: unknown[];
  faqItems: Array<{ question: string; answer: string }>;
}> = [
  {
    title: 'Exploring Market Trends',
    excerpt: 'Discover Emerging Market Trends That Shape Smarter Business Decisions.',
    category: 'Business Research',
    coverImageKey: null,
    order: 0,
    body: [
      p('Markets move fast, and the businesses that stay ahead are the ones that treat market intelligence as an ongoing practice rather than a one-off project.'),
      h2('What "Emerging" Really Means'),
      p('An emerging trend is a signal, not yet a certainty — early adoption data, shifting search and purchase behavior, or a regulatory change still working its way through an industry.'),
      ul([
        'Track leading indicators, not just quarterly results',
        'Compare regional adoption curves, not a single home market',
        'Validate signals with primary research before betting on them',
      ]),
      quote('The businesses that win are rarely the first to spot a trend — they are the first to validate it properly.'),
      p('Unimrkt Research helps organizations turn early signals into confident, evidence-backed decisions across every stage of the research lifecycle.'),
    ],
    faqItems: [
      { question: 'How do you separate a real trend from noise?', answer: 'By triangulating multiple independent data sources — search/behavioral data, primary interviews, and industry benchmarks — before calling something a trend.' },
      { question: 'How often should market trend tracking happen?', answer: 'Quarterly at minimum for fast-moving categories, with lightweight monthly signal checks in between.' },
      { question: 'Can this be done for a niche/regional market?', answer: 'Yes — regional and niche-market tracking is one of the most common engagements we run.' },
    ],
  },
  {
    title: 'Key Trends Shaping the Future of the Automotive Industry',
    excerpt:
      'The automotive industry is undergoing one of the most significant transformations in its history, driven by electrification, autonomous technology, and shifting consumer expectations.',
    category: 'Primary Research',
    coverImageKey: 'blogGridBusiness',
    order: 1,
    // Verbatim off Figma node 587:3338's own sample article (the node's
    // real body copy for this exact post) — every paragraph/heading/list
    // below is copied, not paraphrased.
    body: [
      p('The automotive industry is undergoing one of the biggest transformations in its history. Electric vehicles, connected mobility, artificial intelligence, and sustainability initiatives are reshaping how vehicles are designed, manufactured, and used. As traditional automakers compete with emerging EV brands and technology companies, understanding these shifts has become critical. This article explores the key trends that are defining the future of the automotive industry and what they mean for businesses across the mobility ecosystem.'),
      h2('Trend 1: Rapid Growth of Electric Vehicles (EVs)'),
      p('Electrification remains the single biggest transformation within the automotive industry. According to an International Energy Agency (IEA) report, global electric car sales exceeded 20 million units in 2025, representing a 20% increase from 2024. EVs accounted for approximately 25% of total global car sales. This marked the fifth consecutive year in which annual EV sales increased by nearly 3.5 million vehicles annually. Key drivers behind EV growth include:'),
      ul([
        'Government subsidies and tax incentives',
        'Stricter emission regulations',
        'Expansion of charging infrastructure',
        'Falling battery costs',
        'Rising consumer demand for low-emission mobility',
      ]),
      p('The global automotive industry is also witnessing rapid battery innovation. Manufacturers are investing heavily in:'),
      ul([
        'Solid-state batteries',
        'Lithium-sulfur battery technologies',
        'Faster charging systems',
        'Higher energy-density storage solutions',
      ]),
      p('Emerging markets are becoming increasingly important for EV adoption. According to an IEA report, several countries across Latin America, Asia Pacific, and the Middle East crossed a 10% electric car sales share in 2025, supported by the growing affordability of Chinese-made EVs. China alone accounted for more than half of the global increase in EV sales in 2025, further strengthening its position as a global EV leader. For automotive market research companies, tracking EV infrastructure, battery investments, and regional adoption trends has become a major focus area within automotive industry market research.'),
      h2('Trend 2: Connected Vehicles and Smart Mobility'),
      p('Connected vehicles are transforming how consumers interact with automobiles. Modern vehicles increasingly function as digital mobility ecosystems powered by:'),
      ul(['IoT integration', 'Cloud connectivity', 'Real-time diagnostics', 'Vehicle-to-everything (V2X) communication', 'AI-enabled infotainment systems']),
      p('According to Nielsen’s Gracenote automotive report, consumer expectations around in-car infotainment and connected experiences continue to evolve rapidly:'),
      ul([
        '67% of vehicle owners prefer infotainment systems that can organize content regardless of source',
        '63% are interested in personalized content recommendations based on listening behavior',
        '51% want real-time news updates, sports alerts, and live information inside vehicles',
        '28% would like expanded access to talk radio and news content within their vehicles',
      ]),
      p('Automakers are responding by expanding software-defined vehicle (SDV) capabilities and connected ecosystems. For example, BYD recently integrated Samsung into its phone-to-car connectivity ecosystem, enabling compatible users to instantly transfer navigation addresses to vehicle infotainment systems. Other major connected mobility trends include:'),
      ul(['Over-the-air software updates', 'Connected fleet management', 'AI-powered voice assistants', 'Smartphone-integrated mobility platforms']),
      p('Automotive industry research increasingly focuses on how connected mobility impacts:'),
      ul(['Consumer engagement', 'Brand loyalty', 'Digital user experiences', 'Subscription-based mobility services']),
      h2('Trend 3: Artificial Intelligence Transforming the Automotive Industry'),
      p('Artificial intelligence is rapidly becoming central to automotive innovation. AI is now being used across:'),
      p('AI-powered Advanced Driver Assistance Systems (ADAS) help vehicles:'),
      ul(['Detect obstacles', 'Monitor road conditions', 'Improve braking response', 'Support adaptive cruise control', 'Enhance lane management systems']),
      p('Google recently announced that more than 250 million Android Auto-compatible vehicles are currently on the road globally. In addition, cars with Google built-in are now available across 100+ vehicle models from 16 automotive brands. The company is also expanding AI integration through Gemini-powered automotive experiences, highlighting how AI is reshaping in-car ecosystems. AI is also improving predictive vehicle maintenance. Real-time analytics can identify performance issues before breakdowns occur, helping reduce repair costs and improve operational efficiency. Within automotive manufacturing, AI-driven systems are improving:'),
      ul(['Quality inspection', 'Supply chain forecasting', 'Inventory optimization', 'Production efficiency']),
      p('From an automotive marketing research perspective, AI is helping manufacturers analyze:'),
      ul(['Driving behavior', 'Consumer preferences', 'Digital engagement patterns', 'Mobility usage trends']),
      p('As AI capabilities continue advancing, automotive industry research is expected to increasingly focus on intelligent mobility ecosystems and AI-powered transportation systems.'),
      quote("Electrification isn't just changing vehicles—it's reshaping the entire automotive industry."),
      h2('Why Automotive Market Research Matters Today'),
      p('The automotive sector is becoming increasingly data-driven. Companies can no longer rely solely on traditional demand patterns or historical sales performance to make decisions. Today, automotive market research helps businesses:'),
      ul([
        'Understand changing consumer behavior',
        'Track EV adoption trends',
        'Monitor connected mobility developments',
        'Evaluate regional investment opportunities',
        'Analyze competitor strategies',
        'Forecast future mobility demand',
      ]),
      p('Automobile market research is now critical for: OEMs, EV startups, Battery manufacturers, Mobility platforms, and Automotive technology providers. As competition intensifies, automotive market research firms and automotive marketing research services can help businesses make faster, more informed strategic decisions.'),
      h2('Choose Unimrkt Research for Automotive Market Research Services'),
      p('The automotive industry is evolving rapidly through electrification, connected mobility, AI integration, and sustainability-driven innovation. In such a dynamic environment, businesses need reliable automotive market research to make informed strategic decisions. With over 16 years of expertise in primary market research, Unimrkt Research helps organizations track industry trends, understand consumer behavior, evaluate regional opportunities, and monitor competitive developments across the automotive ecosystem. As one of the leading market research companies in India, Unimrkt Research delivers reliable, data-driven insights backed by ISO 20252 and ISO 27001 certified processes for quality and data security. From EV adoption and autonomous mobility to digital retail and connected vehicle technologies, our automotive industry research solutions help businesses navigate change with confidence and make smarter long-term decisions. Ready to gain access to structured market data? Contact Unimrkt Research at +91-124-424-5210, email at sales@unimrkt.com, or fill out our contact form to discuss your research requirements.'),
    ],
    faqItems: [
      { question: 'What topics does the Unimrkt Research Blog cover?', answer: 'Market research methodologies, industry trends, consumer behavior, business strategy, and emerging market opportunities across the sectors we serve.' },
      { question: 'How does automotive marketing research help manufacturers?', answer: 'It helps manufacturers track EV adoption, connected-mobility usage, and AI-driven engagement patterns so product and marketing decisions are grounded in real consumer behavior rather than assumption.' },
      { question: 'How often is new content published?', answer: 'New articles are published regularly, drawing on ongoing research engagements and industry developments as they happen.' },
      { question: 'Are the blog articles based on industry expertise?', answer: 'Yes — every article is written or reviewed by researchers and analysts who work directly on the studies and engagements the content is based on.' },
    ],
  },
  {
    title: 'How Market Research Strengthens Scenario Planning and Strategic Decision-Making',
    excerpt:
      'Economic cycles, competitive pressure, regulatory shifts, and evolving customer expectations all place unpredictable demands on modern businesses.',
    category: 'Qualitative Research',
    coverImageKey: 'blogGridScenario',
    order: 2,
    body: [
      p('Economic cycles, competitive pressure, regulatory shifts, and evolving customer expectations all place unpredictable demands on modern businesses. Scenario planning is how well-run organizations turn that uncertainty into a manageable set of decisions.'),
      h2('Building Scenarios on Real Evidence, Not Assumption'),
      p('A scenario is only as useful as the evidence behind it. Market research supplies the demand signals, competitive intelligence, and customer sentiment data that separate a plausible scenario from a guess.'),
      ul([
        'Demand-side signals: purchase intent, willingness to pay, category switching',
        'Supply-side signals: competitor moves, channel shifts, regulatory change',
        'Sentiment signals: brand perception and unmet-need tracking over time',
      ]),
      p('Organizations that pair qualitative depth (why customers behave the way they do) with quantitative breadth (how many, how often) build scenarios that hold up under real market pressure — and make faster, more confident calls when conditions shift.'),
    ],
    faqItems: [
      { question: 'How many scenarios should a business plan for?', answer: 'Typically three to four — a base case plus two or three plausible deviations — enough to stress-test a strategy without diluting focus.' },
      { question: 'How is this different from a standard market forecast?', answer: 'A forecast projects one likely future; scenario planning deliberately explores several, so the business has a pre-built response ready whichever one occurs.' },
      { question: 'What research inputs matter most for scenario planning?', answer: 'A mix of primary qualitative interviews (to understand the "why") and quantitative tracking data (to understand the "how many/how often").' },
    ],
  },
  {
    title: 'What Does a Business Research Company Do? Role, Services, and Impact',
    excerpt:
      'Whether it is a startup validating a new business model or an enterprise entering a new market, structured research plays a decisive role.',
    category: 'Quantitative Research',
    coverImageKey: 'blogGridLifecycle',
    order: 3,
    body: [
      p('Whether it is a startup validating a new business model or an enterprise entering a new market, structured research plays a decisive role in whether that decision succeeds. A business research company exists to supply exactly that: structured, evidence-based answers to the questions that matter before money and reputation are committed.'),
      h2('What a Business Research Company Actually Does'),
      p('Beyond running surveys, a business research partner designs the right method for the question at hand, recruits the right respondents, and turns raw data into a decision-ready recommendation. In practice, that work spans:'),
      ul([
        'Market sizing and opportunity assessment',
        'Competitive benchmarking and positioning studies',
        'Customer satisfaction and loyalty (CSAT/NPS) tracking',
        'New product/concept testing before launch',
        'Pricing and willingness-to-pay research',
        'Brand health and perception tracking over time',
      ]),
      h2('Who Actually Uses These Services'),
      p('The demand spans company stage and sector: founders validating a first product, growth-stage teams entering a new geography, and enterprises defending share against new entrants all rely on the same discipline — replacing internal assumption with external evidence.'),
      quote('The cost of research is always smaller than the cost of a decision made without it.'),
      h2('Choosing the Right Research Partner'),
      p('The right business research company brings methodological rigor (proper sampling, validated instruments, unbiased analysis), sector-specific experience, and — critically — a recommendation, not just a data dump. With over a decade of primary research experience, Unimrkt Research helps organizations turn market uncertainty into a clear, evidence-backed next step. Contact us at sales@unimrkt.com to discuss your research requirements.'),
    ],
    faqItems: [
      { question: 'What is the difference between a business research company and a market research company?', answer: '"Business research" is often used as the broader umbrella — covering market, customer, competitor, and internal-operations research — while "market research" typically focuses specifically on the market/customer side.' },
      { question: 'How long does a typical business research engagement take?', answer: 'A focused study (e.g. concept testing or a CSAT wave) usually runs 3–6 weeks; a full market-entry assessment can run 8–12 weeks depending on geography and sample size.' },
      { question: 'Do I need a business research company if I already have internal data?', answer: 'Internal data tells you what your existing customers did; external research tells you why, and what the wider market (including non-customers) thinks — both are usually needed for a confident decision.' },
    ],
  },
  {
    title: 'How the Selection of Quantitative Research Method Shapes the Quality of Business Insights',
    excerpt:
      'Most businesses today have access to more data than ever before, yet the quality of the insight depends entirely on the method used to gather it.',
    category: 'Quantitative Research',
    coverImageKey: 'blogGridQuant2',
    order: 4,
    body: [
      p('Most businesses today have access to more data than ever before, yet the quality of the insight depends entirely on the method used to gather it. The wrong method can produce a large, precise-looking dataset that still answers the wrong question.'),
      h2('Matching Method to Question'),
      p('Quantitative research spans several distinct methods, each suited to a different kind of question and each with its own trade-offs in cost, speed, and precision.'),
      ul([
        'Online surveys — fast, scalable, best for broad attitudinal and behavioral tracking',
        'Telephonic surveys — higher engagement for harder-to-reach or older demographics',
        'CAPI/in-person interviews — richer context, better for low-literacy or rural samples',
        'Panel-based tracking — best for measuring change over time against a consistent baseline',
      ]),
      p('Sampling design matters as much as the method itself: a statistically representative sample, correct quota structure, and appropriate weighting are what turn raw responses into a number a business can actually act on.'),
    ],
    faqItems: [
      { question: 'How do I know which quantitative method is right for my study?', answer: 'It depends on your target respondent, required sample size, timeline, and budget — a research partner should recommend the method based on those constraints, not default to one method for every project.' },
      { question: 'What sample size is considered statistically reliable?', answer: 'It depends on the population size and desired confidence level, but most B2C studies target at least 300–400 completes per key segment to keep the margin of error manageable.' },
    ],
  },
  {
    title: "The Anatomy of a High-Converting Survey: Mapping Questions to the Buyer's Journey",
    excerpt: 'Survey-driven decision-making remains a foundational tool for understanding customer sentiment and predicting behavior.',
    category: 'Qualitative Research',
    coverImageKey: 'blogGridSurvey',
    order: 5,
    body: [
      p("Survey-driven decision-making remains a foundational tool for understanding customer sentiment and predicting behavior — but only when the questions themselves are mapped to where a customer actually sits in their buying journey."),
      h2('Awareness, Consideration, Decision — Different Questions for Each Stage'),
      p('A single generic questionnaire rarely serves every stage well. Effective surveys vary structure and question type by journey stage:'),
      ul([
        'Awareness stage: open-ended, unaided-recall questions to capture true top-of-mind perception',
        'Consideration stage: comparative and trade-off questions (e.g. MaxDiff, ranking) between real alternatives',
        'Decision stage: intent, willingness-to-pay, and barrier-to-purchase questions',
      ]),
      p('Question order and length matter too: front-loading the highest-value questions and keeping the instrument under 10–12 minutes materially improves both completion rates and data quality.'),
    ],
    faqItems: [
      { question: 'How long should a customer survey be?', answer: 'Under 10–12 minutes for most B2C studies — completion and data-quality both drop noticeably past that point.' },
      { question: 'Should the same survey be used across all customer segments?', answer: 'Generally no — question emphasis should shift by journey stage and, where segments behave very differently, by segment as well.' },
    ],
  },
  {
    title: 'Where Market Research Fits Across the Entire Business Lifecycle',
    excerpt: 'Most businesses do not fail due to a lack of effort, but due to decisions made without the right information at the right time.',
    category: 'Business Research',
    coverImageKey: 'blogGridSupport1',
    order: 6,
    body: [
      p('Most businesses do not fail due to a lack of effort, but due to decisions made without the right information at the right time. Market research has a distinct, useful role at every stage of a business’s life — not just at launch.'),
      h2('Research at Every Stage'),
      ul([
        'Ideation: concept and demand testing before a product exists',
        'Launch: pricing, packaging, and go-to-market message testing',
        'Growth: customer satisfaction, churn drivers, and expansion opportunity sizing',
        'Maturity: brand health tracking and competitive defense',
        'Renewal: repositioning and new-segment opportunity assessment',
      ]),
      p('Treating research as a one-time launch activity, rather than a capability revisited at each stage, is one of the most common (and avoidable) strategic blind spots we see.'),
    ],
    faqItems: [
      { question: 'Is market research only useful before launching a product?', answer: 'No — it is equally valuable at growth, maturity, and renewal stages, just answering different questions at each one.' },
      { question: 'How often should an established business revisit its research?', answer: 'At minimum annually for brand/competitive tracking, and ahead of any major strategic decision (new market, new segment, repositioning).' },
    ],
  },
  {
    title: 'From Gut Health to Functional Foods: Why Fiber is the Next Big Trend in Consumer Products',
    excerpt: 'The global shift toward preventive health and wellness has placed gut health and functional nutrition at the center of consumer demand.',
    category: 'Primary Research',
    coverImageKey: 'blogGridQualitative2',
    order: 7,
    body: [
      p('The global shift toward preventive health and wellness has placed gut health and functional nutrition at the center of consumer demand, and fiber — long an overlooked nutrient — is emerging as a genuine growth category.'),
      h2('What Is Driving the Shift'),
      ul([
        'Rising consumer awareness of the gut-immune-health connection',
        'Growth of functional-food and fortified-product categories',
        'Demand for "clean label" ingredients consumers already recognize',
        'Increased willingness to pay a premium for preventive-health products',
      ]),
      p('For brands and manufacturers, the opportunity is real but narrow: research consistently shows consumers reward genuine formulation transparency and penalize products that market a health claim without substantiating it.'),
    ],
    faqItems: [
      { question: 'Is the fiber/gut-health trend consistent across markets?', answer: 'Directionally yes, but adoption speed and price sensitivity vary meaningfully by region — worth validating locally before a launch.' },
      { question: 'How can a brand validate a functional-food claim before launch?', answer: 'Concept and claims testing with the target consumer segment, ideally alongside a competitive claims audit, before formulation is finalized.' },
    ],
  },
  {
    title: 'Qualitative Market Research and Customer Journey Mapping for Sales',
    excerpt: 'Customer decision-making is not a linear affair; it moves across touchpoints, emotions, and moments of hesitation before a purchase is made.',
    category: 'Research Support Functions',
    coverImageKey: 'blogFieldResearch',
    order: 8,
    body: [
      p('Customer decision-making is not a linear affair; it moves across touchpoints, emotions, and moments of hesitation before a purchase is made — and qualitative research is how that path actually gets seen.'),
      h2('Mapping the Moments That Matter'),
      p('In-depth interviews and moderated discussions surface the specific moments — a confusing checkout step, an unanswered objection, a competitor comparison — that quantitative funnel data alone can flag but not explain.'),
      ul([
        'Identify emotional high/low points across the journey, not just drop-off rates',
        'Surface the language customers actually use to describe a problem',
        'Reveal unmet needs a structured survey would never think to ask about',
      ]),
      p('Sales teams that receive this kind of mapping — not just a funnel chart — consistently report better objection-handling and higher close rates, because the friction points are now named, not guessed at.'),
    ],
    faqItems: [
      { question: 'How is qualitative journey mapping different from analytics-based funnel analysis?', answer: 'Funnel analytics show where customers drop off; qualitative research explains why, in the customer’s own words.' },
      { question: 'How many interviews are needed for a reliable journey map?', answer: 'Most B2C studies reach thematic saturation around 12–15 in-depth interviews per key segment; B2B studies with more distinct buyer roles may need more.' },
    ],
  },
  {
    title: 'All You Need to Know About Online Market Research',
    excerpt: 'In a world where consumer behavior evolves faster than a trending topic, online market research has become the fastest way to keep pace.',
    category: 'Business Research',
    coverImageKey: 'blogAiWorkforce',
    order: 9,
    body: [
      p('In a world where consumer behavior evolves faster than a trending topic, online market research has become the fastest way for businesses to keep pace with what customers actually want.'),
      h2('What Online Market Research Covers'),
      ul([
        'Online surveys — broad, fast attitudinal and behavioral data collection',
        'Online focus groups and communities — ongoing qualitative dialogue with a recruited panel',
        'Social listening — unprompted sentiment at scale',
        'A/B and concept testing — real reaction to specific creative or product variants',
      ]),
      p('The trade-off businesses should plan for is representativeness: online panels skew toward more digitally engaged respondents, so studies targeting a broader population still need careful quota design — or a blended online/offline approach — to stay reliable.'),
    ],
    faqItems: [
      { question: 'Is online research reliable for every market?', answer: 'It is highly reliable for digitally engaged populations; markets with lower internet penetration usually need a blended online/offline sample to stay representative.' },
      { question: 'How fast can an online research study be completed?', answer: 'A straightforward online survey can field and report within 1–2 weeks; more complex studies with multiple segments typically take 3–4 weeks.' },
    ],
  },
];

async function upsertBlogs(strapi: any, images: Record<string, number | null>, categoryIdsByName: Record<string, string>) {
  const uid = 'api::blog.blog';
  for (const post of BLOG_POSTS_SEED) {
    const slug = slugifyTitle(post.title);
    // eslint-disable-next-line no-await-in-loop -- each post must fully commit before the next, for readable seed logs
    await upsertBySlug(strapi, uid, slug, {
      title: post.title,
      slug,
      excerpt: post.excerpt,
      // A documentId, not the raw string — same "pass the related
      // document's documentId directly" convention the service hierarchy's
      // `parent` relation already uses (see upsertServiceHierarchy()).
      category: categoryIdsByName[post.category],
      coverImage: post.coverImageKey ? images[post.coverImageKey] : null,
      order: post.order,
      body: post.body,
      faqItems: post.faqItems,
    });
  }
  strapi.log.info(`[seed] Blog posts: ${BLOG_POSTS_SEED.length} upserted, published, and image-linked.`);
}

// ---------------------------------------------------------------------------
// 11. "Why Choose Us" page — the full multi-section "Our Company" page at
//     Figma node 617:7561, walked top to bottom and mapped onto this
//     project's existing block vocabulary wherever one already fits
//     (hero, stats-band, content, cta), plus one new block
//     (blocks.process-steps) for the one section nothing already
//     modeled. Real copy/stats/steps below are all taken directly off
//     that node — see each block's own comment for the section it came
//     from. Every visual value (the why-choose-us gradient band, the
//     process-step card's shadow/border/faint-numeral treatment) was
//     confirmed against an actual rendered screenshot crop of the node,
//     not just its raw layer metadata, after an earlier pass got the
//     why-choose-us section's background/card-count wrong going off
//     metadata alone.
// ---------------------------------------------------------------------------

const WHY_CHOOSE_US_ITEMS = [
  {
    title: 'Global Reach',
    description: 'Access diverse markets across continents.',
    iconIdentifier: 'global',
    order: 0,
  },
  {
    title: 'Deep Expertise',
    description: 'Experienced researchers across industries.',
    iconIdentifier: 'profile-2user',
    order: 1,
  },
  {
    title: 'Faster Decisions',
    description: 'Clear insights delivered when they matter.',
    iconIdentifier: 'timer',
    order: 2,
  },
  {
    title: 'Reliable Quality',
    description: 'Research built on rigorous standards.',
    iconIdentifier: 'shield-tick',
    order: 3,
  },
];

// "Our Research Ecosystem" / "From Question to Business Decision" — 4
// numbered steps (635:9633/9657/9666/9710). Icon 3 ("Decode") is a deep
// multi-layer masked illustration with no single exportable asset —
// iconIdentifier-only fallback for that one, real uploaded icons for
// the other 3 (process-inspection/discovery/timing.svg).
const PROCESS_STEPS_ITEMS = [
  {
    stepNumber: '01',
    title: 'Define',
    description: 'We define business challenges and research goals to uncover clear opportunities for growth.',
    iconIdentifier: 'inspection',
    imageFilename: 'process-inspection.svg',
    order: 0,
  },
  {
    stepNumber: '02',
    title: 'Discover',
    description: 'We discover insights, trends, and opportunities that help businesses make smarter decisions and grow.',
    iconIdentifier: 'discovery',
    imageFilename: 'process-discovery.svg',
    order: 1,
  },
  {
    stepNumber: '03',
    title: 'Decode',
    description: 'We decode complex data into clear insights that reveal meaning, direction, and opportunities for business growth.',
    iconIdentifier: 'decode',
    imageFilename: null,
    order: 2,
  },
  {
    stepNumber: '04',
    title: 'Deliver',
    description: 'We deliver actionable insights that empower businesses to make confident decisions and achieve sustainable growth.',
    iconIdentifier: 'timing',
    imageFilename: 'process-timing.svg',
    order: 3,
  },
];

async function upsertWhyChooseUsPage(strapi: any) {
  const slug = 'why-choose-us';

  const heroImageId = await uploadAsset(strapi, 'hero-photo.jpg');
  const aboutImageId = await uploadAsset(strapi, 'services-earth.jpg');
  const stepImageIds: Record<string, number | null> = {};
  for (const step of PROCESS_STEPS_ITEMS) {
    // eslint-disable-next-line no-await-in-loop
    stepImageIds[step.stepNumber] = step.imageFilename ? await uploadAsset(strapi, step.imageFilename) : null;
  }

  await upsertBySlug(strapi, 'api::page.page', slug, {
    title: 'Why Choose Us',
    slug,
    blocks: [
      // 1. Hero Banner (617:7680/7688/7689/7735) — "Research That Moves
      //    Business Forward".
      {
        __component: 'blocks.hero',
        heading: 'Research That Moves Business Forward',
        subheading:
          'Introduce Unimrkt as a global market research partner helping organisations understand people, markets, and opportunities.',
        media: heroImageId,
        mediaAlignment: 'background',
        actions: [{ label: 'Explore Our Capabilities', href: '/contact', isExternal: false, variant: 'primary' }],
      },
      // 2. Core Value Proposition / Stats Highlight Band (827:10081) —
      //    the same 4 figures as the site-wide "90+ Countries" strip.
      {
        __component: 'blocks.stats-band',
        heading: 'Research Without Borders',
        items: [
          { value: '90+', label: 'Countries' },
          { value: '22+', label: 'Languages' },
          { value: '450+', label: 'CATI Stations' },
          { value: '16+', label: 'Years of Experience' },
        ],
      },
      // 3. Global Reach / Quality Standards / Certifications (620:8135-8140,
      //    "We Turn Questions Into Clarity") — the ESOMAR/ISO 20252/ISO
      //    27001 certification copy lives in this paragraph verbatim.
      {
        __component: 'blocks.content',
        heading: 'We Turn Questions Into Clarity',
        body:
          'Founded on 6 December 2009, Unimrkt Research has evolved into a trusted global market research partner, conducting multi-industry research across 90 countries and four continents — the Americas, Europe, Asia Pacific, and Africa. With expertise spanning 22+ foreign languages, we connect businesses with diverse audiences and deliver culturally relevant, actionable insights across markets. Our commitment to quality, security, and research integrity is reflected in our adherence to ESOMAR principles and our ISO 20252 and ISO 27001 certifications. Combining global reach, deep industry expertise, robust methodologies, and advanced data collection capabilities, Unimrkt Research helps organizations better understand their markets, customers, and opportunities to make confident, data-driven decisions.',
        media: aboutImageId,
        mediaAlignment: 'right',
      },
      // 4. "Why Choose Us" Feature / Differentiator Grid (620:8295-8302 +
      //    635:9832/9846/9859/9869) — full-bleed brand-gradient band, 4
      //    cards, confirmed against a rendered screenshot.
      {
        __component: 'blocks.why-choose-us',
        eyebrow: 'Why Businesses Choose Unimrkt',
        heading: 'Insights That Move Businesses Forward',
        subheading:
          'Transforming complex data into clear, actionable insights that help businesses make smarter decisions and unlock new opportunities.',
        theme: 'accent',
        items: WHY_CHOOSE_US_ITEMS,
      },
      // 5. Process / Methodology (620:8145-8147 + 635:9633/9657/9666/9710)
      //    — "Our Research Ecosystem" / "From Question to Business
      //    Decision", 4 numbered steps.
      {
        __component: 'blocks.process-steps',
        eyebrow: 'Our Research Ecosystem',
        heading: 'From Question to Business Decision',
        subheading: 'A highly visual interactive journey:',
        steps: PROCESS_STEPS_ITEMS.map((step) => ({
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          iconIdentifier: step.iconIdentifier,
          icon: stepImageIds[step.stepNumber],
          order: step.order,
        })),
      },
      // 6. Bottom CTA (617:7611-7621) — "Start Your Research Journey".
      {
        __component: 'blocks.cta',
        heading: 'Start Your Research Journey',
        body: 'Partner with Unimrkt Research to uncover actionable market intelligence, understand your industry, and make confident business decisions.',
        actions: [{ label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' }],
        theme: 'accent',
      },
    ],
    seo: {
      metaTitle: 'Why Choose Us | Unimrkt Research',
      metaDescription:
        'Transforming complex data into clear, actionable insights that help businesses make smarter decisions and unlock new opportunities.',
      keywords: 'why choose unimrkt, market research differentiators, global research partner',
    },
  });
  strapi.log.info('[seed] Why Choose Us page: upserted and published with 6 blocks (hero, stats-band, content, why-choose-us, process-steps, cta).');
}

// ---------------------------------------------------------------------------
// 12. Services Page settings (singleType) — every hardcoded string in
//     Frontend/views/services/ServiceListingView.tsx and its child
//     components, moved into Strapi. The category grid itself stays
//     sourced from the `service` hierarchy (getServiceTree()), not this
//     single type — there's nothing to duplicate there.
// ---------------------------------------------------------------------------

const SERVICES_PAGE_VALUE_PROPS = [
  { title: 'Research Excellence', description: '', iconIdentifier: 'trophy', statValue: '16+ Years', statLabel: 'of Research Excellence', order: 0 },
  { title: 'Countries Covered', description: '', iconIdentifier: 'global', statValue: '90+ Countries', statLabel: 'Covered', order: 1 },
  { title: 'Languages Supported', description: '', iconIdentifier: 'languages', statValue: '22+ Languages', statLabel: 'Supported', order: 2 },
  { title: 'Research Professionals', description: '', iconIdentifier: 'users', statValue: 'Experienced', statLabel: 'Research Professionals', order: 3 },
  { title: 'Research Solutions', description: '', iconIdentifier: 'box', statValue: 'Customized', statLabel: 'Research Solutions', order: 4 },
  { title: 'Actionable Insights', description: '', iconIdentifier: 'shield-check', statValue: 'Accurate', statLabel: '& Actionable Insights', order: 5 },
];

const SERVICES_PAGE_WORKFLOW_STEPS = [
  {
    stepNumber: '01',
    title: 'Discover Your Objectives',
    description: 'Aligning research goals, target audience, and business context to establish clear project milestones.',
    iconIdentifier: 'inspection',
    imageFilename: 'process-clipboard-tick.svg',
    order: 0,
  },
  {
    stepNumber: '02',
    title: 'Design the Research',
    description: 'Carefully designing research methodologies to deliver reliable, actionable, and impactful results.',
    iconIdentifier: 'discovery',
    imageFilename: 'process-brush.svg',
    order: 1,
  },
  {
    stepNumber: '03',
    title: 'Collect Quality Data',
    description: 'Gathering accurate, reliable data from trusted sources for meaningful business insights.',
    iconIdentifier: 'decode',
    imageFilename: 'process-presentation-chart.svg',
    order: 2,
  },
  {
    stepNumber: '04',
    title: 'Analyze & Validate',
    description: 'Transforming raw data into accurate, validated insights for confident business decisions.',
    iconIdentifier: 'timing',
    imageFilename: 'process-chart.svg',
    order: 3,
  },
];

const SERVICES_PAGE_FAQ_ITEMS = [
  {
    question: 'What services does Unimrkt Research provide?',
    answer:
      'Unimrkt Research provides comprehensive qualitative and quantitative research, secondary research, CATI, CAWI, and online global panel services across B2B and B2C sectors.',
  },
  {
    question: 'How do I choose the right research service for my project?',
    answer:
      'Our team collaborates directly with you to understand your objectives, timelines, and budget, designing a bespoke methodology tailored to your market.',
  },
  {
    question: 'Can Unimrkt Research handle global and multi-country research projects?',
    answer:
      'Yes, we possess on-the-ground reach and vetted panel infrastructure across 110+ markets in North America, Europe, APAC, LATAM, and the Middle East.',
  },
  {
    question: 'Which industries do you serve?',
    answer: 'We serve Healthcare & Life Sciences, Technology, BFSI, Automotive, Consumer Goods (FMCG), and Industrial Manufacturing.',
  },
  {
    question: 'Why choose Unimrkt Research as your research partner?',
    answer:
      'With 16+ years of operational excellence, ISO-compliant quality checks, and proprietary panel verification, we ensure clean, decision-ready data.',
  },
];

async function upsertServicesPageSettings(strapi: any) {
  const uid = 'api::services-page.services-page';

  const heroImageId = await uploadAsset(strapi, 'hero-photo.jpg');
  const valuePropsBackgroundId = await uploadAsset(strapi, 'industry-cityscape.jpg');
  const faqBackgroundId = await uploadAsset(strapi, 'worldmap-mask.svg');
  const ctaBackgroundId = await uploadAsset(strapi, 'blog-photo.jpg');

  const valueProps = [];
  for (const prop of SERVICES_PAGE_VALUE_PROPS) {
    valueProps.push({
      title: prop.title,
      description: prop.description,
      iconIdentifier: prop.iconIdentifier,
      statValue: prop.statValue,
      statLabel: prop.statLabel,
      order: prop.order,
    });
  }

  const workflowSteps = [];
  for (const step of SERVICES_PAGE_WORKFLOW_STEPS) {
    // eslint-disable-next-line no-await-in-loop
    const iconId = await uploadAsset(strapi, step.imageFilename);
    workflowSteps.push({
      stepNumber: step.stepNumber,
      title: step.title,
      description: step.description,
      iconIdentifier: step.iconIdentifier,
      icon: iconId,
      order: step.order,
    });
  }

  const data = {
    hero: {
      eyebrow: 'OUR SERVICES',
      heading: 'Research Solutions That Drive Business Growth',
      subheading:
        'Helping organizations transform data into actionable insights through comprehensive market research and business intelligence.',
      media: heroImageId,
      mediaAlignment: 'background',
      actions: [
        { label: 'Get a Free Quote', href: '/contact', isExternal: false, variant: 'primary' },
        { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' },
      ],
    },
    introEyebrow: 'ABOUT OUR SERVICES',
    introHeading: 'Comprehensive Research Solutions For Smarter Business Decisions',
    introParagraph1:
      'At Unimrkt Research, we provide end-to-end market research services that empower businesses with accurate data, actionable insights, and strategic intelligence. From primary data collection and qualitative research to quantitative studies, business research, and research support functions, our tailored solutions help organizations understand markets, customers, and emerging opportunities.',
    introParagraph2:
      "Backed by experienced researchers, advanced methodologies, and global capabilities, we deliver reliable research solutions across diverse industries. Whether you're launching a new product, evaluating market opportunities, or strengthening your competitive position, Unimrkt Research provides the insights you need to make confident, data-driven decisions and achieve sustainable growth.",
    valuePropsHeading: 'Why Choose Unimrkt?',
    valuePropsBody:
      'With 16+ years of expertise, global research capabilities, advanced methodologies, and trusted data quality, Unimrkt delivers accurate insights that empower smarter business decisions and sustainable growth.',
    valuePropsBackground: valuePropsBackgroundId,
    valueProps,
    workflow: {
      eyebrow: 'WORKFLOW',
      heading: 'Research Process',
      subheading:
        'Our proven research process combines strategic planning, precise data collection, rigorous analysis, and actionable reporting to deliver reliable insights that support confident business decisions and measurable growth.',
      steps: workflowSteps,
    },
    faq: {
      heading: 'Frequently Asked Questions',
      background: faqBackgroundId,
      items: SERVICES_PAGE_FAQ_ITEMS,
    },
    cta: {
      heading: 'Start Your Research Journey',
      body: 'Partner with Unimrkt Research to uncover actionable market intelligence, understand your industry, and make confident business decisions.',
      actions: [{ label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' }],
      background: ctaBackgroundId,
    },
  };

  const existing = await strapi.documents(uid).findFirst({});
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  strapi.log.info('[seed] Services page settings: upserted and published (hero, intro, 6 value props, 4 workflow steps, 5 FAQ items, CTA).');
  return doc;
}

// ---------------------------------------------------------------------------
// 13. Our Company page (/our-company, Figma node 617:7561, file
//     foaJFuv0vRX8nD43o0ylgB) — a dedicated singleType, not a `page`
//     dynamiczone entry (see the plan's own architecture note). Every
//     string below is transcribed verbatim from the node's own text
//     layers, with 3 disclosed exceptions where the design file itself
//     is incomplete/inconsistent rather than merely "not yet filled in":
//       1. valuesBody: the node's own text node (627:8708) is a real,
//          literal sentence fragment that stops mid-clause — "...with
//          our focus on" — not a metadata-truncation artifact (confirmed
//          via a direct Dev Mode read of that exact node). Completed
//          naturally rather than shipping a broken sentence.
//       2. ecosystemCards' step numbers: the 4 process cards are numbered
//          01/01/01/04 in the file (a duplication artifact — three
//          duplicated frames were never renumbered to 02/03). The
//          frontend derives the number from the card's array position
//          instead of storing this broken sequence.
//       3. faqItems: all 5 FAQ accordion rows in the node share the
//          exact same placeholder question text verbatim
//          ("What market research services does Unimrkt offer?") — an
//          unfinished Figma placeholder, not 5 distinct real questions.
//          Authored 5 distinct questions about the company in the same
//          voice as this project's other FAQ sections, same convention
//          already applied to every hidden/placeholder FAQ answer
//          elsewhere in this file.
// ---------------------------------------------------------------------------

const OUR_COMPANY_INSIGHTS_CARDS = [
  { title: 'Global Reach', description: 'Access diverse markets across continents.', iconIdentifier: 'global' },
  { title: 'Deep Expertise', description: 'Experienced researchers across industries.', iconIdentifier: 'profile-2user' },
  { title: 'Faster Decisions', description: 'Clear insights delivered when they matter.', iconIdentifier: 'timer' },
  { title: 'Reliable Quality', description: 'Research built on rigorous standards.', iconIdentifier: 'shield-tick' },
];

const OUR_COMPANY_ECOSYSTEM_CARDS = [
  { title: 'Define', description: 'We define business challenges and research goals to uncover clear opportunities for growth.', iconIdentifier: 'inspection' },
  { title: 'Discover', description: 'We discover insights, trends, and opportunities that help businesses make smarter decisions and grow.', iconIdentifier: 'discovery' },
  { title: 'Decode', description: 'We decode complex data into clear insights that reveal meaning, direction, and opportunities for business growth.', iconIdentifier: 'decode' },
  { title: 'Deliver', description: 'We deliver actionable insights that empower businesses to make confident decisions and achieve sustainable growth.', iconIdentifier: 'timing' },
];

const OUR_COMPANY_VALUES_CARDS = [
  { title: 'Clear Communication', description: 'We communicate openly, clearly, and consistently to build trust and ensure shared understanding.', iconIdentifier: 'chat' },
  { title: 'Innovation', description: 'We embrace new ideas, technologies, and approaches to deliver smarter, more effective research solutions.', iconIdentifier: 'idea' },
  { title: 'Team Work', description: 'We collaborate closely, combining diverse expertise to deliver stronger insights and better outcomes.', iconIdentifier: 'teamwork' },
  { title: 'Integrity', description: 'We uphold honesty, transparency, and ethical practices across every project, partnership, and decision.', iconIdentifier: 'network' },
  { title: 'Business Ethics', description: 'We conduct business responsibly, ethically, and transparently, building lasting trust with every stakeholder.', iconIdentifier: 'ethics' },
  { title: 'Transparency', description: 'We communicate openly, share information clearly, and build trust through every interaction.', iconIdentifier: 'transparency' },
  { title: 'Wisdom', description: 'We apply knowledge, experience, and thoughtful judgment to create smarter business outcomes.', iconIdentifier: 'intelligence' },
  { title: 'Diversity', description: 'We value diverse perspectives, experiences, and ideas to create stronger, more inclusive outcomes.', iconIdentifier: 'cultural-diversity' },
];

// `oc-` prefix is deliberate — `industry-automotive.jpg`/
// `industry-healthcare.jpg` already exist as different, unrelated
// photos for the Google Sheet industries migration (api::industry.industry),
// and this file's asset directory dedupes/matches purely by filename.
const OUR_COMPANY_INDUSTRIES_CARDS: Array<{ title: string; imageFilename: string }> = [
  { title: 'Automotive', imageFilename: 'oc-industry-automotive.jpg' },
  { title: 'Healthcare', imageFilename: 'oc-industry-healthcare.jpg' },
  { title: 'Consumer', imageFilename: 'oc-industry-consumer.jpg' },
  { title: 'Technology', imageFilename: 'oc-industry-technology.jpg' },
  { title: 'Financial Services', imageFilename: 'oc-industry-financial-services.jpg' },
  { title: 'B2B & Industrial', imageFilename: 'oc-industry-b2b-industrial.jpg' },
  { title: 'Retail & E-commerce', imageFilename: 'oc-industry-retail-ecommerce.jpg' },
  { title: 'Media & Entertainment', imageFilename: 'oc-industry-media-entertainment.jpg' },
];

const OUR_COMPANY_FAQ_ITEMS = [
  { question: 'What does Unimrkt Research do?', answer: 'We are a global market research and consulting firm helping organizations understand markets, consumers, and emerging opportunities through primary and secondary research, data analytics, and strategic consulting.' },
  { question: 'How many countries and languages do you operate across?', answer: 'Our research capabilities span 90+ countries and 22+ languages, giving us both global reach and genuine local understanding.' },
  { question: 'What quality standards does Unimrkt Research follow?', answer: 'We adhere to ESOMAR principles and hold ISO 20252 and ISO 27001 certifications, reflecting our commitment to research integrity, quality, and data security.' },
  { question: 'What industries does Unimrkt Research serve?', answer: 'We work across automotive, healthcare, consumer, technology, financial services, B2B & industrial, retail & e-commerce, and media & entertainment, among others.' },
  { question: 'How is Unimrkt Research different from other research firms?', answer: 'We combine global reach, deep category expertise, robust methodologies, and advanced data collection capabilities to turn complex data into insights businesses can act on with confidence.' },
];

async function upsertOurCompanyPageSettings(strapi: any) {
  const uid = 'api::our-company-page.our-company-page';

  const heroImageId = await uploadAsset(strapi, 'our-company-hero-bg.jpg');
  const aboutImageId = await uploadAsset(strapi, 'our-company-about-founding.jpg');

  const industriesCards = [];
  for (const card of OUR_COMPANY_INDUSTRIES_CARDS) {
    // eslint-disable-next-line no-await-in-loop -- readable seed logs, matches every other image-upload loop in this file
    const imageId = await uploadAsset(strapi, card.imageFilename);
    industriesCards.push({ title: card.title, image: imageId });
  }

  const data = {
    heroEyebrow: 'Our Company',
    heroHeading: 'Research That Moves Business Forward',
    heroSubheading: 'Introduce Unimrkt as a global market research partner helping organisations understand people, markets, and opportunities.',
    heroImage: heroImageId,
    // The brief's copy specifies "Explore Our Capabilities" with no target
    // page shown in the node; `/services` is the one real page that
    // actually lists Unimrkt's capabilities (same "never link a CTA to a
    // dead/self page" convention as ServiceListingView's BOTTOM_CTA_HREF).
    heroCta: { label: 'Explore Our Capabilities', href: '/services', isExternal: false, variant: 'primary' },
    statsHeading: 'Research Without Borders',
    stats: [
      { value: '90+', label: 'Countries', iconIdentifier: 'global' },
      { value: '22+', label: 'Languages', iconIdentifier: 'language-circle' },
      { value: '450+', label: 'CATI Stations', iconIdentifier: 'call' },
      { value: '16+', label: 'Years of Experience', iconIdentifier: 'medal-star' },
    ],
    aboutEyebrow: 'About Unimrkt',
    aboutHeading: 'We Turn Questions Into Clarity',
    aboutBody:
      'Founded on 6 December 2009, Unimrkt Research has evolved into a trusted global market research partner, conducting multi-industry research across 90 countries and four continents — the Americas, Europe, Asia Pacific, and Africa. With expertise spanning 22+ foreign languages, we connect businesses with diverse audiences and deliver culturally relevant, actionable insights across markets. Our commitment to quality, security, and research integrity is reflected in our adherence to ESOMAR principles and our ISO 20252 and ISO 27001 certifications. Combining global reach, deep industry expertise, robust methodologies, and advanced data collection capabilities, Unimrkt Research helps organizations better understand their markets, customers, and opportunities to make confident, data-driven decisions.',
    aboutImage: aboutImageId,
    insightsEyebrow: 'Why Businesses Choose Unimrkt',
    insightsHeading: 'Insights That Move Businesses Forward',
    insightsBody: 'Transforming complex data into clear, actionable insights that help businesses make smarter decisions and unlock new opportunities.',
    insightsCards: OUR_COMPANY_INSIGHTS_CARDS,
    ecosystemEyebrow: 'Our Research Ecosystem',
    ecosystemHeading: 'From Question to Business Decision',
    ecosystemSubtext: 'A highly visual interactive journey:',
    ecosystemCards: OUR_COMPANY_ECOSYSTEM_CARDS,
    valuesEyebrow: 'Our Values',
    valuesHeading: 'The Principles Behind Our Work',
    valuesBody:
      'We believe that our values not only make us a reliable business partner and consumer research agency, but also a thoughtful one, with our focus on people, integrity, and long-term impact.',
    valuesCards: OUR_COMPANY_VALUES_CARDS,
    industriesEyebrow: 'Industries We Understand',
    industriesHeading: 'Deep Knowledge Across Diverse Industries',
    industriesBody: 'Industry-specific expertise that helps us understand complex markets and deliver insights that drive informed business decisions.',
    industriesCards,
    faqItems: OUR_COMPANY_FAQ_ITEMS,
    aboutCompanyEyebrow: 'About Company',
    aboutCompanyHeading: 'Turning Market Questions Into Business Clarity',
    aboutCompanyBody:
      'Unimrkt is a global market research and insights company helping businesses understand markets, consumers, and emerging opportunities. With research capabilities across 90+ countries and 22+ languages, we bring together global reach, local understanding, and deep industry expertise to uncover meaningful perspectives. From defining business challenges to delivering actionable recommendations, our research is designed to help organisations make informed decisions with confidence. Through rigorous methodologies, advanced technology, and a human-centred approach, we transform complex data and diverse perspectives into insights that create measurable business impact.',
    seo: {
      metaTitle: 'Our Company — Unimrkt Research',
      metaDescription: 'Unimrkt Research is a global market research partner helping organisations understand people, markets, and opportunities across 90+ countries.',
    },
  };

  const existing = await strapi.documents(uid).findFirst({});
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  strapi.log.info('[seed] Our Company page: upserted and published (hero, stats, about, insights, ecosystem, values, industries, FAQ, about company).');
  return doc;
}

/** Deletes the stale generic `page.page` row that used to live at the
 * `our-company` slug (5 Google-Sheet-migration blocks, none of it real
 * Figma content) now that /our-company is a dedicated route backed by
 * api::our-company-page — see the comment above ABOUT_CONTACT_SUBPAGES. */
async function deleteStaleOurCompanyGenericPage(strapi: any) {
  const existing = await strapi.documents('api::page.page').findFirst({ filters: { slug: 'our-company' } });
  if (existing) {
    await strapi.documents('api::page.page').delete({ documentId: existing.documentId });
    strapi.log.info('[seed] Deleted stale generic page.page entry at slug "our-company" (superseded by api::our-company-page).');
  }
}

// ---------------------------------------------------------------------------
// 14. Contact page (/contact, Figma node 637:10433, file
//     foaJFuv0vRX8nD43o0ylgB) — a dedicated singleType. Every string
//     below is transcribed verbatim from the node's own text layers.
//     One disclosed exception: the 5 FAQ items' QUESTIONS are the node's
//     own real, distinct text (confirmed via Dev Mode, not the stale
//     auto-generated layer names get_metadata alone would suggest) —
//     only the ANSWERS are authored, same "accordion is collapsed on
//     canvas, only questions are visible" convention as every other FAQ
//     section in this file.
// ---------------------------------------------------------------------------

const CONTACT_OFFICES = [
  {
    name: 'India Office',
    address: '5th floor, Nimai Tower, 412-415, Udyog Vihar, Phase IV, Gurugram, Haryana-122015',
    email: 'sales@unimrkt.com',
    phoneLabel: 'Sales & Business Queries:',
    phone: '+91 124 424 5210, +91 9870 377 557',
    featured: true,
    imageFilename: 'contact-india-gate.jpg',
  },
  {
    name: 'United States of America',
    address: '98 Cuttermill Road Suite 466, Great Neck, NY 11021, USA',
    email: 'sales@unimrkt.com',
    phoneLabel: null,
    phone: '+1.646.712.9302',
    featured: false,
    imageFilename: null,
  },
  {
    name: 'United Kingdom',
    address: 'The Old Dairy, 12 Stephen Road, Headington, Oxford, Oxfordshire, United Kingdom OX3 9AY',
    email: 'sales@unimrkt.com',
    phoneLabel: null,
    phone: '+1.646.712.9302',
    featured: false,
    imageFilename: null,
  },
];

const CONTACT_FAQ_ITEMS = [
  { question: 'How can I contact Unimrkt Research for market research services?', answer: 'You can reach us through the contact form on this page, by emailing sales@unimrkt.com, or by calling any of our regional offices listed above — our team typically responds within one business day.' },
  { question: 'What types of market research services does Unimrkt offer?', answer: 'We offer primary research, qualitative research, quantitative research, business research, and research support functions, spanning 90+ countries and 22+ languages.' },
  { question: 'Can I discuss a customized research requirement with your team?', answer: 'Absolutely — share a few details in the contact form and a research consultant will follow up to scope a study tailored to your specific requirement.' },
  { question: 'Where are Unimrkt Research offices located?', answer: 'We have offices in India (Gurugram), the United States (Great Neck, NY), and the United Kingdom (Oxford), with research capabilities extending across 90+ countries.' },
  { question: 'How can I work with Unimrkt Research?', answer: "Whether you're looking to commission research or join our team, use the contact form above for client inquiries, or see the Work With Unimrkt section below for career opportunities." },
];

async function upsertContactPageSettings(strapi: any) {
  const uid = 'api::contact-page.contact-page';

  const heroImageId = await uploadAsset(strapi, 'contact-hero-bg.jpg');
  const formImageId = await uploadAsset(strapi, 'contact-form-bg.jpg');
  const workWithUsImageId = await uploadAsset(strapi, 'contact-work-with-us-bg.jpg');

  const offices = [];
  for (const office of CONTACT_OFFICES) {
    // eslint-disable-next-line no-await-in-loop -- readable seed logs, matches every other image-upload loop in this file
    const imageId = office.imageFilename ? await uploadAsset(strapi, office.imageFilename) : null;
    offices.push({
      name: office.name,
      address: office.address,
      email: office.email,
      phone: office.phone,
      phoneLabel: office.phoneLabel,
      featured: office.featured,
      image: imageId,
    });
  }

  const data = {
    heroEyebrow: 'Contact Us',
    heroHeading: 'Let’s Turn Your Business Questions Into Clear Answers',
    heroSubheading: 'Tell us what you’re trying to understand. Our research experts will help you find the right path forward.',
    heroImage: heroImageId,
    // In-page anchor to the form section below — this button is already
    // on /contact, so linking to that same route would be circular.
    heroCta: { label: 'Start a Conversation', href: '#contact-form', isExternal: false, variant: 'primary' },
    statsHeading: 'Research at a Global Scale',
    stats: [
      { value: '90+', label: 'Countries', iconIdentifier: 'global' },
      { value: '22+', label: 'Languages', iconIdentifier: 'language-circle' },
      { value: '450+', label: 'CATI Stations', iconIdentifier: 'call' },
      { value: '16+', label: 'Years of Experience', iconIdentifier: 'medal-star' },
    ],
    officeEyebrow: 'Office Address',
    officeHeading: 'Our Presence',
    offices,
    formEyebrow: 'Contact Form',
    formHeading: 'Let’s Team Up!',
    formSubheading: 'Interested in high-end, extensive market research for your brand?',
    formImage: formImageId,
    faqItems: CONTACT_FAQ_ITEMS,
    workWithUsHeading: 'Work With unimrkt',
    workWithUsBody: 'We offer the best infrastructure for our employees to learn and grow with us.',
    // A real existing page — see ABOUT_CONTACT_SUBPAGES's 'work-with-us' entry.
    workWithUsCta: { label: 'Apply Now', href: '/work-with-us', isExternal: false, variant: 'primary' },
    workWithUsImage: workWithUsImageId,
    seo: {
      metaTitle: 'Contact Us — Unimrkt Research',
      metaDescription: 'Get in touch with Unimrkt Research — tell us what you’re trying to understand and our research experts will help you find the right path forward.',
    },
  };

  const existing = await strapi.documents(uid).findFirst({});
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  strapi.log.info('[seed] Contact page: upserted and published (hero, stats, 3 offices, form, 5 FAQ items, Work With Unimrkt CTA).');
  return doc;
}

// ---------------------------------------------------------------------------
// 15. Work With Us page (/work-with-us, Figma node 924:23216, file
//     foaJFuv0vRX8nD43o0ylgB) — a dedicated singleType. Every string
//     below is transcribed verbatim from the node's own text layers,
//     with 2 disclosed exceptions where the design file itself is
//     incomplete/inconsistent:
//       1. valuesCards: this node's 8 "Core Values" cards share the
//          exact same 8 titles/icons/descriptions as /our-company's
//          Values section (confirmed via Dev Mode on both nodes) — not
//          re-invented, the identical real content, just presented in a
//          different (light pink) card style unique to this page.
//       2. journeySteps: 3 of the 4 "career journey" cards (Apply/
//          Connect/Interview) have copy-pasted description text lifted
//          verbatim from an unrelated section (/our-company's Insights
//          cards — e.g. "Apply" is described as "Access diverse markets
//          across continents.") — a duplication artifact, not real copy
//          for this card. Only "Join" has its own real description.
//          Authored sensible, distinct descriptions for Apply/Connect/
//          Interview in the same voice; "Join" is verbatim.
// ---------------------------------------------------------------------------

const WORK_WITH_US_VALUES_CARDS = [
  { title: 'Clear Communication', description: 'We communicate openly, clearly, and consistently to build trust and ensure shared understanding.', iconIdentifier: 'chat' },
  { title: 'Innovation', description: 'We embrace new ideas, technologies, and approaches to deliver smarter, more effective research solutions.', iconIdentifier: 'idea' },
  { title: 'Wisdom', description: 'We apply knowledge, experience, and thoughtful judgment to create smarter business outcomes.', iconIdentifier: 'intelligence' },
  { title: 'Integrity', description: 'We uphold honesty, transparency, and ethical practices across every project, partnership, and decision.', iconIdentifier: 'network' },
  { title: 'Team Work', description: 'We collaborate closely, combining diverse expertise to deliver stronger insights and better outcomes.', iconIdentifier: 'teamwork' },
  { title: 'Business Ethics', description: 'We conduct business responsibly, ethically, and transparently, building lasting trust with every stakeholder.', iconIdentifier: 'ethics' },
  { title: 'Diversity', description: 'We value diverse perspectives, experiences, and ideas to create stronger, more inclusive outcomes.', iconIdentifier: 'cultural-diversity' },
  { title: 'Transparency', description: 'We communicate openly, share information clearly, and build trust through every interaction.', iconIdentifier: 'transparency' },
];

const WORK_WITH_US_BENEFITS = [
  { title: 'Stock Appreciation Rights (SARs)', iconIdentifier: 'chart' },
  { title: 'Compensatory-Off Reimbursement', iconIdentifier: 'wallet-add' },
  { title: 'Annual Bonus', iconIdentifier: 'star' },
  { title: 'Internal Job Posting', iconIdentifier: 'briefcase' },
  { title: 'Mediclaim', iconIdentifier: 'pill-combination' },
  { title: 'Transport Facility', iconIdentifier: 'transport' },
  { title: 'Leave Encashment', iconIdentifier: 'task-square' },
  { title: 'Meal Facility', iconIdentifier: 'dinner' },
];

const WORK_WITH_US_JOBS = [
  { title: 'Executive – Language & Communication', location: 'Gurugram, India', jobType: 'Full Time', department: 'Training', postedDate: '12 Aug 2026' },
  { title: 'Associate – Primary Research', location: 'Gurugram, India', jobType: 'Full Time', department: 'Operations', postedDate: '12 Aug 2026' },
  { title: 'Associate - Secondary Research', location: 'Gurugram, India', jobType: 'Full Time', department: 'Operations', postedDate: '12 Aug 2026' },
  { title: 'Assistant Manager – India Sales', location: 'Gurugram, India', jobType: 'Full Time', department: 'India Research', postedDate: '12 Aug 2026' },
];

const WORK_WITH_US_JOURNEY_STEPS = [
  { title: 'Apply', description: 'Submit your application and resume for the role that matches your skills and interests.', iconIdentifier: 'clipboard-tick' },
  { title: 'Connect', description: 'Our HR team reviews your profile and reaches out if you are shortlisted for the role.', iconIdentifier: 'profile-2user' },
  { title: 'Interview', description: 'Meet the team to discuss your experience, skills, and fit for the position.', iconIdentifier: 'user-tag' },
  { title: 'Join', description: 'Welcome to Unimrkt! Let’s make an impact together.', iconIdentifier: 'briefcase' },
];

const WORK_WITH_US_FAQ_ITEMS = [
  { question: 'What types of career opportunities are available at Unimrkt?', answer: 'We hire across research operations, primary and secondary research, sales, and training, with roles spanning entry-level to management positions.' },
  { question: 'How can I apply for a job at Unimrkt?', answer: 'Browse our open positions above and click "Apply Now" on any role, or email your resume directly to careers@unimrkt.com.' },
  { question: 'Can I apply if there is no suitable opening?', answer: 'Yes — you can still send your resume to careers@unimrkt.com and our HR team will reach out if a matching role opens up.' },
  { question: 'What is the recruitment process at Unimrkt?', answer: 'After you apply, our HR team reviews your profile, shortlisted candidates are invited to interview with the team, and successful candidates receive an offer to join.' },
  { question: 'What skills does Unimrkt look for in candidates?', answer: 'We look for curiosity, analytical thinking, and a genuine interest in research, alongside the specific skills each role requires.' },
  { question: 'Does Unimrkt charge any recruitment or onboarding fees?', answer: 'No — our recruitment and onboarding processes are entirely free of charge. We never ask candidates for payment at any stage.' },
  { question: 'How will I know if a job opportunity is genuine?', answer: 'Genuine Unimrkt communication only comes from @unimrkt.com, @unimrkthealth.com, or @unimrktresponse.com email domains — see the disclaimer above for full details.' },
];

async function upsertWorkWithUsPageSettings(strapi: any) {
  const uid = 'api::work-with-us-page.work-with-us-page';

  const heroImageId = await uploadAsset(strapi, 'wwu-hero-bg.jpg');
  const benefitsImageId = await uploadAsset(strapi, 'wwu-benefits-photo.jpg');

  const data = {
    heroEyebrow: 'Careers',
    heroHeading: 'Great People Build Great Research',
    heroSubheading: 'At Unimrkt, we give our employees a space to learn, grow and innovate. If you’re passionate about research, data and making an impact you’ll feel right at home here.',
    heroImage: heroImageId,
    // In-page anchor to the job listings section below.
    heroCta: { label: 'Explore Open Positions', href: '#open-positions', isExternal: false, variant: 'primary' },
    valuesEyebrow: 'Core Values of Unimrkt',
    valuesHeading: 'What Drives Us',
    valuesBody: 'Our values shape the way we work, collaborate and create impact every day.',
    valuesCards: WORK_WITH_US_VALUES_CARDS,
    benefitsEyebrow: 'WHY JOIN UNIMRKT',
    benefitsHeading: 'More Than Just a Job',
    benefitsBody: 'We believe in supporting your well-being, growth and future. That’s why we offer a range of benefits that help you thrive personally and professionally.',
    benefitsLabel: 'Benefits:',
    benefitsImage: benefitsImageId,
    benefits: WORK_WITH_US_BENEFITS,
    jobsEyebrow: 'OPEN POSITIONS',
    jobsHeading: 'Find Your Next Opportunity',
    jobsBody: 'Explore roles across different departments and take the next step in your career journey with Unimrkt.',
    jobs: WORK_WITH_US_JOBS,
    journeyEyebrow: 'YOUR CAREER JOURNEY',
    journeyHeading: 'Grow With Purpose',
    journeyBody: 'From day one, you’re supported with the right tools, training and opportunities to build a meaningful career.',
    journeySteps: WORK_WITH_US_JOURNEY_STEPS,
    joinUsHeading: 'Join Us',
    joinUsBody:
      'To apply for the job opening, please send your resume and relevant details to careers@unimrkt.com. Our HR team will review your application and contact you if your profile is shortlisted for the position. Please note that due to the high volume of applications we receive, we may not be able to respond to every inquiry. Thank you for your interest in joining Unimrkt — we look forward to the possibility of working together!',
    disclaimerHeading: 'Disclaimer : Beware of Fraud',
    disclaimerBody:
      'At Unimrkt, we ensure that our prospective candidates and employees are informed about potential fraudulent activities. It is important to note that we do not levy fees or require any form of payment for our recruitment and onboarding processes. These processes are entirely free of charge. We urge you to exercise caution and verify the authenticity of emails by checking the email domain. Unimrkt email domain names are @unimrkt.com, @unimrkthealth.com, and @unimrktresponse.com. We do not send interview emails or offer letters through any other email domains like @gmail.com, @yahoo.com etc. We take fraud seriously and have implemented measures to safeguard our candidates and employees against deception or scams. However, if you encounter any suspicious activity or receive any communication that appears suspicious or requests payment, please refrain from responding and promptly notify us at +91 124 424 5210. Our commitment lies in providing a transparent and fair recruitment process, and we do not tolerate any form of fraud or unethical behavior.',
    faqItems: WORK_WITH_US_FAQ_ITEMS,
    aboutCareersEyebrow: 'ABOUT CAREERS',
    aboutCareersHeading: 'Build Your Career. Create Meaningful Impact.',
    aboutCareersBody:
      'At Unimrkt Research, we believe great work starts with great people. We provide an environment where curious minds can learn, collaborate, innovate, and grow while working on meaningful research projects that shape business decisions. Whether you’re starting your career or looking for your next opportunity, you’ll find opportunities to develop your skills, take on new challenges, and be part of a team that values integrity, collaboration, innovation, and continuous learning.',
    seo: {
      metaTitle: 'Work With Us — Careers at Unimrkt Research',
      metaDescription: 'Explore careers at Unimrkt Research — great people build great research. Browse open positions and find your next opportunity.',
    },
  };

  const existing = await strapi.documents(uid).findFirst({});
  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data })
    : await strapi.documents(uid).create({ data });
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  strapi.log.info('[seed] Work With Us page: upserted and published (hero, values, benefits, 4 jobs, career journey, join us, disclaimer, 7 FAQ items, about careers).');
  return doc;
}

/** Deletes the stale generic `page.page` row that used to live at the
 * `work-with-us` slug (5 Google-Sheet-migration blocks, none of it real
 * Figma content) now that /work-with-us is a dedicated route backed by
 * api::work-with-us-page — see the comment above ABOUT_CONTACT_SUBPAGES. */
async function deleteStaleWorkWithUsGenericPage(strapi: any) {
  const existing = await strapi.documents('api::page.page').findFirst({ filters: { slug: 'work-with-us' } });
  if (existing) {
    await strapi.documents('api::page.page').delete({ documentId: existing.documentId });
    strapi.log.info('[seed] Deleted stale generic page.page entry at slug "work-with-us" (superseded by api::work-with-us-page).');
  }
}

async function resetContent(strapi: any) {
  strapi.log.info('[seed] --reset: truncating content tables');
  await strapi.db.query('api::testimonial.testimonial').deleteMany({});
  await strapi.db.query('api::page.page').deleteMany({});
  await strapi.db.query('api::service.service').deleteMany({});
  await strapi.db.query('api::industry.industry').deleteMany({});
  await strapi.db.query('api::gallery-item.gallery-item').deleteMany({});
  await strapi.db.query('api::blog.blog').deleteMany({});
  await strapi.db.query('api::services-page.services-page').deleteMany({});
  await strapi.db.query('api::our-company-page.our-company-page').deleteMany({});
  await strapi.db.query('api::global.global').deleteMany({});
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

const IMAGE_FILENAMES = {
  // Photographic assets are .jpg — the originals downloaded from Figma
  // were multi-megabyte PNGs (no transparency needed), which caused
  // intermittent ERR_CONNECTION_REFUSED against the single-threaded dev
  // Strapi instance when several loaded concurrently. Re-encoded to
  // resized, compressed JPEGs (see backend/_optimize_assets.js).
  heroPhoto: 'hero-photo.jpg',
  momentsLarge: 'moments-large.jpg',
  momentsSmall: 'moments-small.jpg',
  servicesEarth: 'services-earth.jpg',
  industryHealthcare: 'industry-healthcare.jpg',
  industryBanking: 'industry-banking.jpg',
  industryRetail: 'industry-retail.jpg',
  industryAutomotive: 'industry-automotive.jpg',
  industryCityscape: 'industry-cityscape.jpg',
  // Kept as PNG: line-art/texture (crisp edges, already small) and the
  // pin-marker illustration (transparency-adjacent, already small).
  faqWorldmap: 'faq-worldmap-bg.png',
  blogPhoto: 'blog-photo.jpg',
  blogFieldResearch: 'blog-field-research.jpg',
  blogAiWorkforce: 'blog-ai-workforce.jpg',
  worldmapMarketplaces: 'worldmap-marketplaces.png',
  // "Moments of Excellence" gallery — 6 distinct photos (Figma nodes
  // 267:1285/1290 large, 267:1286-1289 small), replacing the earlier
  // 2-photos-repeated-across-6-slots placeholder.
  galleryLarge1: 'gallery-large-1.jpg',
  galleryLarge2: 'gallery-large-2.jpg',
  gallerySmall1: 'gallery-small-1.jpg',
  gallerySmall2: 'gallery-small-2.jpg',
  gallerySmall3: 'gallery-small-3.jpg',
  gallerySmall4: 'gallery-small-4.jpg',
  // /blogs page (Figma node 522:4719) — 7 additional card photos exported
  // straight from that node's grid, re-encoded the same way as every other
  // photographic asset above (see the comment on `heroPhoto`).
  blogGridQuant2: 'blog-grid-quant2.jpg',
  blogGridSupport1: 'blog-grid-support1.jpg',
  blogGridScenario: 'blog-grid-scenario.jpg',
  blogGridSurvey: 'blog-grid-survey.jpg',
  blogGridQualitative2: 'blog-grid-qualitative2.jpg',
  blogGridBusiness: 'blog-grid-business.jpg',
  blogGridLifecycle: 'blog-grid-lifecycle.jpg',
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

    // 5. Service category hierarchy (Google Sheet IA migration) — the only
    //    content this seeds into `service` now; the 3 demo entries and the
    //    city-service-override rows/functions that used to run here were
    //    removed (see the comments above sections 4 and 6).
    await upsertServiceHierarchy(app);

    // 8. Industries (Google Sheet IA migration).
    await upsertIndustries(app);

    // 9. About US / Contact US sub-pages (Google Sheet IA migration).
    await upsertAboutContactSubpages(app);

    // 10. Gallery items (/gallery page migration off its static fixture).
    await upsertGalleryItems(app);

    // 10.4. Blog categories — must exist before the posts that relate to them.
    const categoryIdsByName = await upsertCategories(app);

    // 10.5. Blog posts (/blogs page, Figma node 522:4719).
    await upsertBlogs(app, images, categoryIdsByName);

    // 11. Why Choose Us page (blocks.why-choose-us, Figma node 617:7561).
    await upsertWhyChooseUsPage(app);

    // 12. Services page settings (/services hero/intro/value-props/workflow/FAQ/CTA).
    await upsertServicesPageSettings(app);

    // 13. Our Company page (/our-company, Figma node 617:7561) — a
    //     dedicated page, replacing the generic page.page entry that used
    //     to live at this slug.
    await deleteStaleOurCompanyGenericPage(app);
    await upsertOurCompanyPageSettings(app);

    // 14. Contact page (/contact, Figma node 637:10433).
    await upsertContactPageSettings(app);

    // 15. Work With Us page (/work-with-us, Figma node 924:23216) — a
    //     dedicated page, replacing the generic page.page entry that used
    //     to live at this slug.
    await deleteStaleWorkWithUsGenericPage(app);
    await upsertWorkWithUsPageSettings(app);

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
