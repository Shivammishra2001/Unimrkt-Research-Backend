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
        actions: [
          { label: 'Browse Gallery', href: '/#gallery', isExternal: false, variant: 'secondary' },
          { label: 'Browse Blogs', href: '/#blogs', isExternal: false, variant: 'secondary' },
        ],
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

interface ServiceHierarchySeed extends ResearchContent {
  title: string;
  legacyUrl?: string;
  suggestedUrl?: string;
  children?: ServiceHierarchySeed[];
}

const SERVICES_HIERARCHY: ServiceHierarchySeed[] = [
  {
    title: 'Primary Research',
    legacyUrl: 'https://www.unimrkt.com/primary-research.php',
    suggestedUrl: 'https://www.unimrkt.com/services/primary-research.php',
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

async function upsertServiceHierarchy(strapi: any) {
  const seenSlugs = new Set<string>();
  let count = 0;

  for (const parentSeed of SERVICES_HIERARCHY) {
    const parentSlug = slugifyTitle(parentSeed.title);
    seenSlugs.add(parentSlug);

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
        legacyUrl: parentSeed.legacyUrl ?? null,
        suggestedUrl: parentSeed.suggestedUrl ?? null,
        parent: null,
        blocks: buildResearchBlocks(parentSeed.title, parentSeed),
        seo: buildResearchSeo(parentSeed.title, parentSeed),
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
          blocks: buildResearchBlocks(child.title, child),
          seo: buildResearchSeo(child.title, child),
        },
        true // published
      );
      count += 1;
    }
  }

  strapi.log.info(`[seed] Service hierarchy: ${count} entries upserted and published, each with ${5} content blocks + SEO.`);
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

interface IndustrySeed extends ResearchContent {
  title: string;
  legacyUrl?: string;
  suggestedUrl: string;
}

const INDUSTRIES_SEED: IndustrySeed[] = [
  {
    title: 'Automotives',
    suggestedUrl: 'https://www.unimrkt.com/industries/automotive-market-research.php',
    summary: 'Our Automotive research helps OEMs, dealers, and suppliers understand shifting buyer preferences — from EV adoption and connected-car features to dealership experience and total cost of ownership perceptions.',
    overview: 'We combine buyer journey surveys, dealer mystery-shopping, and conjoint analysis on feature trade-offs to help automotive clients prioritize product and go-to-market decisions with confidence.',
    stats: [['40+', 'OEM & supplier studies delivered'], ['15+', 'Markets covered'], ['EV & ICE', 'Powertrain segments researched'], ['Dealer & OEM', 'Stakeholder perspectives covered']],
    useCases: 'Applied to new model launch research, EV adoption tracking, dealership experience audits, and connected-vehicle feature prioritization.',
    ctaHeading: 'Planning your next automotive study?',
    ctaBody: 'Talk to a specialist about buyer research for your model or market.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Studies typically combine quantitative buyer surveys with qualitative dealership visits, benchmarked against category norms we track continuously.',
    metaDescription: 'Automotive market research covering EV adoption, dealer experience, and connected-vehicle feature preferences.',
    keywords: 'automotive market research, EV research, dealer experience, automotive industry insights',
  },
  {
    title: 'Chemicals',
    suggestedUrl: 'https://www.unimrkt.com/industries/chemicals-market-research.php',
    summary: 'Our Chemicals industry research supports B2B demand forecasting, customer satisfaction, and go-to-market decisions for specialty and commodity chemical producers navigating shifting regulation and end-market demand.',
    overview: 'We interview technical buyers and procurement stakeholders directly, pairing primary data with market-sizing analysis to map demand across end-use segments and geographies.',
    stats: [['B2B-focused', 'Respondent recruitment'], ['20+', 'End-use segments mapped'], ['Technical buyers', 'Direct access'], ['Global', 'Market coverage']],
    useCases: 'Used for market sizing, customer satisfaction and loyalty studies, and new product/application demand assessment.',
    ctaHeading: 'Size your chemicals market opportunity',
    ctaBody: 'Talk to a specialist about demand research for your product line.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Engagements typically combine technical-buyer interviews with desk research on regulatory and end-market trends.',
    metaDescription: 'Chemicals industry market research — demand sizing, customer satisfaction, and go-to-market insight for B2B producers.',
    keywords: 'chemicals market research, B2B research, specialty chemicals, industrial research',
  },
  {
    title: 'Energy & Utilities',
    suggestedUrl: 'https://www.unimrkt.com/industries/energy-and-utilities-market-research.php',
    summary: 'Our Energy & Utilities research helps providers understand customer satisfaction, renewable-adoption attitudes, and regulatory-stakeholder perceptions across residential and commercial segments.',
    overview: 'We field regulator-compliant customer satisfaction surveys, model renewable-energy adoption scenarios, and support rate-case research with defensible, methodologically sound data.',
    stats: [['Residential & C&I', 'Segments covered'], ['Regulator-ready', 'Survey methodology'], ['Renewables tracking', 'Ongoing studies'], ['Multi-utility', 'Benchmark data available']],
    useCases: 'Applied to customer satisfaction tracking, renewable adoption studies, and rate-case and regulatory stakeholder research.',
    ctaHeading: 'Understand your customers better',
    ctaBody: 'Talk to a specialist about satisfaction or adoption research for your utility.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Studies follow regulator-recognized survey methodologies where required, with benchmarking against our multi-utility norms database.',
    metaDescription: 'Energy and utilities market research — customer satisfaction, renewable adoption, and regulatory stakeholder studies.',
    keywords: 'energy market research, utilities research, renewable adoption research',
  },
  {
    title: 'Banking and Finance',
    suggestedUrl: 'https://www.unimrkt.com/industries/banking-and-finance-market-research.php',
    summary: 'Our Banking and Finance research covers digital banking adoption, customer satisfaction, and product concept testing for retail and commercial banks navigating fintech disruption.',
    overview: 'We combine large-sample quantitative tracking with qualitative journey research to help banks understand where digital experience is winning or losing customer trust.',
    stats: [['Retail & commercial', 'Banking segments covered'], ['Digital journeys', 'Mapped end-to-end'], ['NPS benchmarking', 'Available'], ['Multi-market', 'Fielding capability']],
    useCases: 'Used for digital banking adoption studies, satisfaction and NPS tracking, and new product/feature concept testing.',
    ctaHeading: 'Benchmark your banking experience',
    ctaBody: 'Talk to a specialist about customer research for your institution.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Tracking studies are benchmarked against our ongoing banking-sector norms, with qualitative journey research layered in to explain the numbers.',
    metaDescription: 'Banking and finance market research — digital adoption, satisfaction tracking, and product concept testing.',
    keywords: 'banking market research, financial services research, digital banking research',
  },
  {
    title: 'Food & Beverage',
    suggestedUrl: 'https://www.unimrkt.com/industries/food-and-beverage-market-research.php',
    summary: 'Our Food & Beverage research supports product development, packaging testing, and concept validation for CPG brands navigating shifting consumer taste and health preferences.',
    overview: 'We run central-location taste tests, in-home usage tests, and concept/packaging studies to de-risk product decisions before they reach shelf.',
    stats: [['Blind taste tests', 'Standard offering'], ['iHUTs', 'Real-world usage testing'], ['Packaging studies', 'Shelf-impact tested'], ['Health & wellness', 'Trend tracking included']],
    useCases: 'Applied to new product development, packaging and claims testing, and health/wellness trend tracking.',
    ctaHeading: 'De-risk your next product launch',
    ctaBody: 'Talk to a specialist about taste, packaging, or concept testing.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Product tests combine blind sensory evaluation with branded concept exposure to separate taste performance from brand halo effects.',
    metaDescription: 'Food and beverage market research — product testing, packaging studies, and consumer trend tracking for CPG brands.',
    keywords: 'food and beverage research, CPG research, product testing, taste testing',
  },
  {
    title: 'Life Sciences & Healthcare',
    suggestedUrl: 'https://www.unimrkt.com/industries/life-sciences-and-healthcare-market-research.php',
    summary: 'Our Life Sciences & Healthcare research supports pharma, medtech, and provider organizations with patient experience studies, physician research, and market access insight — conducted to strict compliance standards.',
    overview: 'We recruit and interview physicians, patients, and payers under full compliance with healthcare research regulations, delivering insight that supports launch, access, and patient-experience decisions.',
    stats: [['HCP & patient', 'Respondent access'], ['Compliance-first', 'Recruitment protocols'], ['Market access', 'Payer research included'], ['Global', 'Therapeutic area coverage']],
    useCases: 'Used for product launch research, patient experience studies, physician attitude and prescribing research, and market access/payer studies.',
    ctaHeading: 'Bring evidence to your next launch',
    ctaBody: 'Talk to a specialist about compliant healthcare research design.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'All healthcare studies follow strict respondent-consent and data-privacy protocols, with recruitment validated against professional credentials where required.',
    metaDescription: 'Life sciences and healthcare market research — patient experience, physician insight, and market access studies.',
    keywords: 'healthcare market research, life sciences research, patient experience research, pharma research',
  },
  {
    title: 'IT & Telecom',
    suggestedUrl: 'https://www.unimrkt.com/industries/it-and-telecome-market-research.php',
    summary: 'Our IT & Telecom research helps operators and technology vendors understand customer churn drivers, network experience perceptions, and enterprise buyer decision journeys.',
    overview: 'We combine churn-driver analysis, network experience surveys, and B2B buyer interviews to help telecom and IT clients prioritize investment and retention strategy.',
    stats: [['Churn modeling', 'Available'], ['B2B & consumer', 'Segments covered'], ['Network experience', 'Tracking studies'], ['Enterprise buyers', 'Direct access']],
    useCases: 'Applied to churn and retention research, network/service experience tracking, and enterprise technology buyer studies.',
    ctaHeading: 'Reduce churn with better data',
    ctaBody: 'Talk to a specialist about churn or experience research for your business.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Churn studies combine survey data with behavioral segmentation to identify which experience factors most predict attrition.',
    metaDescription: 'IT and telecom market research — churn analysis, network experience tracking, and enterprise buyer research.',
    keywords: 'telecom market research, IT research, churn analysis, enterprise technology research',
  },
  {
    title: 'Media & Entertainment',
    // Only industry row with a real (non-"NA") legacy URL in the sheet.
    legacyUrl: 'https://www.unimrkt.com/industries/media-and-entertainment.php',
    suggestedUrl: 'https://www.unimrkt.com/industries/media-and-entertainment-market-research.php',
    summary: 'Our Media & Entertainment research helps studios, platforms, and publishers understand content engagement, subscription behavior, and audience segmentation across a fragmenting media landscape.',
    overview: 'We field concept and content testing, subscription/churn studies, and audience segmentation research to help media clients make sharper content and pricing decisions.',
    stats: [['Content testing', 'Concept & pilot stage'], ['Churn & pricing', 'Subscription research studies'], ['Behavioral', 'Audience segmentation coverage'], ['Cross-platform', 'Coverage']],
    useCases: 'Used for content concept testing, subscription pricing and churn research, and audience segmentation for targeting.',
    ctaHeading: 'Understand your audience better',
    ctaBody: 'Talk to a specialist about content or subscription research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Segmentation studies combine viewing/behavioral data (where available) with attitudinal survey data for a complete audience picture.',
    metaDescription: 'Media and entertainment market research — content testing, subscription research, and audience segmentation.',
    keywords: 'media research, entertainment market research, audience segmentation, content testing',
  },
  {
    title: 'Metals and Mining',
    suggestedUrl: 'https://www.unimrkt.com/industries/metals-and-mining-market-research.php',
    summary: 'Our Metals and Mining research supports demand forecasting, stakeholder engagement, and community-impact studies for producers navigating volatile commodity markets and rising ESG scrutiny.',
    overview: 'We combine B2B demand-side interviews with community and stakeholder research to give mining and metals clients a complete view of market and social-license risk.',
    stats: [['B2B demand studies', 'Core offering'], ['Community engagement', 'Research included'], ['ESG-focused', 'Stakeholder studies'], ['Global', 'Commodity coverage']],
    useCases: 'Applied to demand forecasting, community/stakeholder engagement studies, and ESG perception research.',
    ctaHeading: 'Understand your market and stakeholders',
    ctaBody: 'Talk to a specialist about demand or community research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Community studies are designed with local research partners to ensure culturally appropriate engagement and data quality.',
    metaDescription: 'Metals and mining market research — demand forecasting, community engagement, and ESG stakeholder studies.',
    keywords: 'mining market research, metals industry research, ESG research, commodity research',
  },
  {
    title: 'Retail & CPG',
    suggestedUrl: 'https://www.unimrkt.com/industries/retail-and-cpg-market-research.php',
    summary: 'Our Retail & CPG research covers shopper behavior, planogram and pricing testing, and brand tracking for retailers and consumer goods manufacturers competing for shelf space and share of wallet.',
    overview: 'We run shopper intercepts, in-store and online path-to-purchase studies, and pricing/promotion research to help retail and CPG clients optimize the full path from awareness to purchase.',
    stats: [['Shopper intercepts', 'In-store and online'], ['Available', 'Pricing & promo testing'], ['Brand tracking', 'Ongoing studies'], ['Omnichannel', 'Path-to-purchase mapping']],
    useCases: 'Used for shopper behavior studies, pricing and promotion testing, and brand health tracking.',
    ctaHeading: 'Win the path to purchase',
    ctaBody: 'Talk to a specialist about shopper or pricing research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Path-to-purchase studies combine in-the-moment intercepts with follow-up surveys to connect in-store behavior to purchase outcomes.',
    metaDescription: 'Retail and CPG market research — shopper behavior, pricing testing, and brand tracking studies.',
    keywords: 'retail market research, CPG research, shopper research, brand tracking',
  },
  {
    title: 'Transportation',
    suggestedUrl: 'https://www.unimrkt.com/industries/transportation-market-research.php',
    summary: 'Our Transportation research supports logistics providers, airlines, and public transit agencies with customer satisfaction, service-quality, and demand-forecasting studies.',
    overview: 'We field rider/customer satisfaction tracking, service-quality benchmarking, and demand studies to help transportation clients prioritize operational investment.',
    stats: [['Rider satisfaction', 'Tracking studies'], ['Service benchmarking', 'Vs. category norms'], ['Demand forecasting', 'Included'], ['Public & private', 'Sector coverage']],
    useCases: 'Applied to customer/rider satisfaction tracking, service-quality benchmarking, and route/demand planning research.',
    ctaHeading: 'Improve the customer journey',
    ctaBody: 'Talk to a specialist about satisfaction or demand research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Satisfaction tracking is benchmarked against our transportation-sector norms database to contextualize scores.',
    metaDescription: 'Transportation industry market research — rider satisfaction, service benchmarking, and demand forecasting studies.',
    keywords: 'transportation market research, logistics research, transit research',
  },
  {
    title: 'Professional & Business Services',
    suggestedUrl: 'https://www.unimrkt.com/industries/professional-and-business-services-market-research.php',
    summary: 'Our Professional & Business Services research helps consulting, legal, and B2B service firms understand client satisfaction, win/loss dynamics, and brand perception among decision-makers.',
    overview: 'We conduct client satisfaction interviews, win/loss analysis, and brand perception studies with senior B2B decision-makers to help service firms sharpen positioning and delivery.',
    stats: [['Client satisfaction', 'Interview-based studies'], ['Win/loss analysis', 'Available'], ['Direct access', 'Senior decision-makers'], ['Brand perception', 'Tracking included']],
    useCases: 'Used for client satisfaction and relationship health studies, win/loss analysis, and brand positioning research.',
    ctaHeading: 'Understand why clients choose you',
    ctaBody: 'Talk to a specialist about client or win/loss research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: "Win/loss interviews are conducted by a neutral third party to encourage candor that internal teams often can't get.",
    metaDescription: 'Professional and business services market research — client satisfaction, win/loss analysis, and brand perception studies.',
    keywords: 'professional services research, B2B research, win loss analysis, client satisfaction research',
  },
  {
    title: 'Education',
    suggestedUrl: 'https://www.unimrkt.com/industries/education.php',
    summary: 'Our Education research supports institutions and edtech providers with student experience studies, enrollment/demand research, and learning-outcome perception surveys.',
    overview: 'We field student and parent satisfaction surveys, enrollment-journey research, and edtech usability studies to help education clients improve outcomes and retention.',
    stats: [['Student & parent', 'Respondent access'], ['Enrollment research', 'Journey mapping included'], ['EdTech usability', 'Testing available'], ['K-12 & higher-ed', 'Segment coverage']],
    useCases: 'Applied to student experience and satisfaction research, enrollment/demand studies, and edtech product testing.',
    ctaHeading: 'Improve student outcomes and retention',
    ctaBody: 'Talk to a specialist about student experience research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Studies combine survey data with qualitative student/parent interviews to explain the drivers behind satisfaction scores.',
    metaDescription: 'Education market research — student experience, enrollment research, and edtech usability studies.',
    keywords: 'education market research, edtech research, student experience research',
  },
  {
    title: 'Fintech',
    suggestedUrl: 'https://www.unimrkt.com/industries/fintech-market-research.php',
    summary: 'Our Fintech research helps digital-first financial products understand user onboarding friction, feature adoption, and trust perceptions in a category where switching costs are low and competition is high.',
    overview: 'We combine usability testing, adoption funnel analysis, and trust/security perception research to help fintech clients reduce churn and accelerate feature adoption.',
    stats: [['Onboarding funnel', 'Friction analysis'], ['Feature adoption', 'Tracking studies'], ['Trust & security', 'Perception research'], ['Digital-native', 'Respondent panels']],
    useCases: 'Used for onboarding optimization research, feature adoption tracking, and trust/security perception studies.',
    ctaHeading: 'Reduce onboarding drop-off',
    ctaBody: 'Talk to a specialist about fintech user research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Onboarding research combines usability testing with funnel-drop-off survey data to pinpoint exactly where users disengage.',
    metaDescription: 'Fintech market research — onboarding, feature adoption, and trust perception studies for digital financial products.',
    keywords: 'fintech research, digital banking research, user onboarding research',
  },
  {
    title: 'Oil & Gas',
    suggestedUrl: 'https://www.unimrkt.com/industries/oil-and-gas-market-research.php',
    summary: 'Our Oil & Gas research supports upstream, midstream, and downstream players with market demand studies, stakeholder engagement, and workforce/safety-culture research.',
    overview: 'We combine B2B demand analysis with stakeholder and community research to give oil and gas clients a complete view of market and social-license considerations.',
    stats: [['Value-chain coverage', 'Upstream to downstream'], ['Studies included', 'Stakeholder engagement'], ['Safety culture', 'Workforce research available'], ['Global', 'Market coverage']],
    useCases: 'Applied to demand forecasting, stakeholder/community engagement, and workforce safety-culture research.',
    ctaHeading: 'Understand your market and workforce',
    ctaBody: 'Talk to a specialist about demand or workforce research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: "Workforce safety-culture studies combine confidential employee surveys with qualitative interviews to surface issues staff won't raise through normal channels.",
    metaDescription: 'Oil and gas market research — demand forecasting, stakeholder engagement, and workforce safety-culture studies.',
    keywords: 'oil and gas market research, energy sector research, workforce research',
  },
  {
    title: 'Real Estate',
    suggestedUrl: 'https://www.unimrkt.com/industries/real-estate-market-research.php',
    summary: 'Our Real Estate research helps developers, brokerages, and property managers understand buyer/renter preferences, amenity valuation, and market demand across residential and commercial segments.',
    overview: 'We field buyer/renter preference studies, amenity and feature trade-off research, and market demand analysis to help real estate clients prioritize development and leasing decisions.',
    stats: [['Segments covered', 'Residential & commercial'], ['Amenity valuation', 'Trade-off studies'], ['Market demand', 'Sizing available'], ['Buyer & renter', 'Direct research']],
    useCases: 'Used for development feasibility studies, amenity/feature prioritization, and market demand and pricing research.',
    ctaHeading: 'Prioritize what buyers actually want',
    ctaBody: 'Talk to a specialist about buyer or renter preference research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Amenity studies use trade-off analysis (conjoint) to quantify exactly how much each feature is worth to buyers, not just whether they like it.',
    metaDescription: 'Real estate market research — buyer and renter preferences, amenity valuation, and market demand studies.',
    keywords: 'real estate market research, property research, amenity research',
  },
  {
    title: 'Travel & Tourism',
    suggestedUrl: 'https://www.unimrkt.com/industries/travel-and-tourism-market-research.php',
    summary: 'Our Travel & Tourism research helps airlines, hotels, and destinations understand traveler decision journeys, satisfaction drivers, and destination perception in a highly seasonal, experience-driven category.',
    overview: 'We field traveler journey research, satisfaction and NPS tracking, and destination brand perception studies to help travel and tourism clients improve experience and drive repeat visitation.',
    stats: [['Traveler journey', 'Mapping studies'], ['NPS benchmarking', 'Satisfaction tracking'], ['Brand studies', 'Destination perception'], ['Seasonal', 'Fielding cadence available']],
    useCases: 'Applied to guest/traveler satisfaction tracking, destination brand perception studies, and booking-journey research.',
    ctaHeading: 'Improve the traveler experience',
    ctaBody: 'Talk to a specialist about traveler or destination research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Journey research maps satisfaction at every touchpoint from booking through post-trip, identifying exactly where experience breaks down.',
    metaDescription: 'Travel and tourism market research — traveler journey, satisfaction tracking, and destination perception studies.',
    keywords: 'travel market research, tourism research, destination research, guest satisfaction research',
  },
  {
    title: 'Manufacturing',
    suggestedUrl: 'https://www.unimrkt.com/industries/manufacturing-market-research.php',
    summary: 'Our Manufacturing research supports industrial and consumer-goods manufacturers with B2B customer satisfaction, supply-chain stakeholder research, and product demand forecasting.',
    overview: 'We conduct B2B buyer interviews, distributor/channel satisfaction studies, and demand forecasting to help manufacturing clients align production and go-to-market strategy with real demand signals.',
    stats: [['B2B buyer research', 'Direct access'], ['Available', 'Channel/distributor studies'], ['Demand forecasting', 'Included'], ['Global', 'Manufacturing coverage']],
    useCases: 'Used for B2B customer satisfaction studies, channel/distributor research, and demand forecasting for production planning.',
    ctaHeading: 'Align production with real demand',
    ctaBody: 'Talk to a specialist about B2B or demand research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Channel studies interview both direct B2B customers and distribution partners to give a complete view of the demand chain.',
    metaDescription: 'Manufacturing market research — B2B customer satisfaction, channel research, and demand forecasting studies.',
    keywords: 'manufacturing market research, industrial research, B2B demand research',
  },
  {
    title: 'Architecture & Construction',
    suggestedUrl: 'https://www.unimrkt.com/industries/architecture-and-construction-market-research.php',
    summary: 'Our Architecture & Construction research helps firms and material suppliers understand client satisfaction, specification decision drivers, and demand trends across residential and commercial building.',
    overview: 'We interview architects, contractors, and property owners to understand what drives material and vendor specification decisions, supporting go-to-market and product development strategy.',
    stats: [['Direct access', 'Architect & contractor'], ['Decision-driver', 'Specification research studies'], ['Segment coverage', 'Residential & commercial'], ['Material & vendor', 'Preference tracking']],
    useCases: 'Applied to specification decision research, client satisfaction studies, and building-material demand tracking.',
    ctaHeading: 'Understand specification decisions',
    ctaBody: 'Talk to a specialist about architect or contractor research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Specification research combines interviews with architects and contractors at the actual decision point in a project, not after the fact.',
    metaDescription: 'Architecture and construction market research — specification research, client satisfaction, and demand studies.',
    keywords: 'construction market research, architecture research, building materials research',
  },
  {
    title: 'Sports',
    suggestedUrl: 'https://www.unimrkt.com/industries/sports-market-research.php',
    summary: 'Our Sports research helps leagues, teams, and sponsors understand fan engagement, sponsorship value, and viewership behavior across an increasingly fragmented media landscape.',
    overview: 'We field fan engagement surveys, sponsorship value studies, and viewership/consumption research to help sports organizations and sponsors quantify and grow audience value.',
    stats: [['Fan engagement', 'Tracking studies'], ['ROI research', 'Sponsorship valuation'], ['Viewership behavior', 'Cross-platform tracking'], ['Global', 'Fan base coverage']],
    useCases: 'Used for fan engagement tracking, sponsorship value and ROI studies, and viewership/consumption behavior research.',
    ctaHeading: 'Quantify your fan value',
    ctaBody: 'Talk to a specialist about fan or sponsorship research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Sponsorship valuation combines brand-recall survey data with engagement metrics to quantify the actual value delivered to sponsors.',
    metaDescription: 'Sports market research — fan engagement, sponsorship valuation, and viewership behavior studies.',
    keywords: 'sports market research, fan engagement research, sponsorship research',
  },
  {
    title: 'E-commerce & Online Marketplaces Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/ecommerce-market-research.php',
    summary: 'Our E-commerce & Online Marketplaces research helps online retailers and platforms understand conversion funnel drop-off, seller/buyer trust dynamics, and competitive positioning in a fast-moving category.',
    overview: 'We combine funnel analytics review with usability testing and buyer/seller satisfaction research to help e-commerce clients improve conversion and marketplace trust.',
    stats: [['Funnel analysis', 'Drop-off diagnostics'], ['Buyer & seller', 'Satisfaction research'], ['Usability testing', 'Included'], ['Marketplace trust', 'Perception studies']],
    useCases: 'Applied to conversion optimization research, marketplace trust and safety studies, and competitive benchmarking.',
    ctaHeading: 'Improve conversion and trust',
    ctaBody: 'Talk to a specialist about e-commerce or marketplace research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Funnel research pairs quantitative drop-off data with qualitative usability sessions to explain not just where but why users abandon.',
    metaDescription: 'E-commerce and online marketplace research — conversion optimization, trust studies, and competitive benchmarking.',
    keywords: 'e-commerce market research, online marketplace research, conversion research',
  },
  {
    title: 'Agriculture & Agritech Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/agriculture-and-agritech-market-research.php',
    summary: 'Our Agriculture & Agritech research helps input suppliers, equipment makers, and agritech startups understand farmer decision-making, technology adoption barriers, and market demand across diverse farming segments.',
    overview: 'We interview farmers and agribusiness stakeholders directly to understand what drives adoption of new inputs, equipment, and technology, supporting go-to-market strategy for agriculture clients.',
    stats: [['Farmer interviews', 'Direct access'], ['Technology adoption', 'Barrier analysis'], ['Multi-crop', 'Segment coverage'], ['Global', 'Agricultural market reach']],
    useCases: 'Used for technology/input adoption research, farmer segmentation studies, and market demand forecasting.',
    ctaHeading: 'Understand farmer decision-making',
    ctaBody: 'Talk to a specialist about agriculture or agritech research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Adoption studies combine farmer interviews with behavioral segmentation to identify which farmer types are ready to adopt new technology first.',
    metaDescription: 'Agriculture and agritech market research — farmer decision-making, technology adoption, and demand studies.',
    keywords: 'agriculture market research, agritech research, farmer research',
  },
  {
    title: 'Fashion & Textile Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/fashion-and-textile-market-research.php',
    summary: 'Our Fashion & Textile research helps brands and manufacturers understand consumer style preferences, sustainability attitudes, and pricing sensitivity across a fast-cycling category.',
    overview: 'We field concept and trend testing, sustainability perception studies, and pricing research to help fashion and textile clients make sharper product and merchandising decisions.',
    stats: [['Trend testing', 'Concept validation'], ['Consumer attitudes', 'Sustainability research studies'], ['Pricing sensitivity', 'Analysis included'], ['Global', 'Fashion market coverage']],
    useCases: 'Applied to trend and concept testing, sustainability perception research, and pricing/merchandising studies.',
    ctaHeading: 'Validate your next collection',
    ctaBody: 'Talk to a specialist about trend or concept testing.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Trend studies combine social listening with concept-testing surveys to validate which emerging styles have real commercial demand.',
    metaDescription: 'Fashion and textile market research — trend testing, sustainability attitudes, and pricing sensitivity studies.',
    keywords: 'fashion market research, textile research, trend testing, sustainability research',
  },
  {
    title: 'AeroSpace and Defence Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/aerospace-defence-market-research.php',
    summary: 'Our Aerospace and Defence research supports manufacturers and suppliers with stakeholder engagement, procurement decision research, and market demand analysis in a highly regulated, long-cycle industry.',
    overview: 'We conduct interviews with procurement officials, technical evaluators, and end-users to understand decision criteria in complex, long-cycle aerospace and defence purchasing.',
    stats: [['Procurement research', 'Decision-driver studies'], ['Long-cycle', 'Industry expertise'], ['Technical evaluators', 'Direct access'], ['Global', 'Defence market coverage']],
    useCases: 'Used for procurement decision research, competitive positioning studies, and market demand forecasting.',
    ctaHeading: 'Understand procurement decisions',
    ctaBody: 'Talk to a specialist about aerospace or defence research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: "Procurement research is designed around your specific program's evaluation criteria and stakeholder structure, respecting confidentiality requirements throughout.",
    metaDescription: 'Aerospace and defence market research — procurement decisions, stakeholder engagement, and demand studies.',
    keywords: 'aerospace market research, defence industry research, procurement research',
  },
  {
    title: 'Insurance Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/insurance-market-research.php',
    summary: 'Our Insurance research helps carriers and brokers understand policyholder satisfaction, claims-experience perception, and product demand across life, health, and property & casualty lines.',
    overview: 'We field policyholder satisfaction tracking, claims-experience research, and product concept testing to help insurance clients improve retention and identify new product opportunities.',
    stats: [['Tracking studies', 'Policyholder satisfaction'], ['Claims experience', 'Research included'], ['Life, health, P&C', 'Line coverage'], ['Available', 'Product concept testing']],
    useCases: 'Applied to policyholder satisfaction and retention research, claims-experience studies, and new product concept testing.',
    ctaHeading: 'Improve policyholder retention',
    ctaBody: 'Talk to a specialist about satisfaction or claims research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Claims-experience research surveys policyholders immediately post-claim, when the experience is freshest and most actionable.',
    metaDescription: 'Insurance market research — policyholder satisfaction, claims experience, and product concept testing.',
    keywords: 'insurance market research, policyholder research, claims experience research',
  },
  {
    title: 'Legal Services Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/legal-services-market-research.php',
    summary: 'Our Legal Services research helps law firms and legal-tech providers understand client satisfaction, competitive positioning, and legal-tech adoption among corporate and individual clients.',
    overview: 'We conduct client satisfaction interviews, win/loss analysis, and legal-tech usability research to help legal services clients sharpen positioning and improve client experience.',
    stats: [['Client satisfaction', 'Interview-based studies'], ['Win/loss analysis', 'Available'], ['Legal-tech adoption', 'Usability research'], ['Client segments', 'Corporate & individual']],
    useCases: 'Used for client satisfaction and relationship research, competitive win/loss analysis, and legal-tech product testing.',
    ctaHeading: 'Understand your clients better',
    ctaBody: 'Talk to a specialist about client or legal-tech research.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Client satisfaction interviews are conducted by a neutral third party to encourage the candor firms rarely get asking directly.',
    metaDescription: 'Legal services market research — client satisfaction, win/loss analysis, and legal-tech adoption studies.',
    keywords: 'legal services research, law firm research, legal tech research',
  },
  {
    // Sheet typo "FMCG Market Rsearch" corrected here.
    title: 'FMCG Market Research',
    suggestedUrl: 'https://www.unimrkt.com/industries/fmcg-market-research.php',
    summary: 'Our FMCG research helps consumer packaged goods brands validate product concepts, test packaging, and track brand health in one of the most competitive, fast-cycling categories in consumer research.',
    overview: 'We run concept and packaging testing, in-home usage tests, and brand tracking studies to help FMCG clients de-risk launches and defend market share against private label and new entrants.',
    stats: [['Concept testing', 'Standard offering'], ['Packaging studies', 'Shelf-impact tested'], ['Brand tracking', 'Ongoing studies'], ['iHUTs', 'Real-world usage testing']],
    useCases: 'Applied to new product launch research, packaging and claims testing, and ongoing brand health tracking.',
    ctaHeading: 'De-risk your next FMCG launch',
    ctaBody: 'Talk to a specialist about concept or packaging testing.',
    ctaLabel: 'Consult Our Research Specialists',
    methodology: 'Concept tests are benchmarked against our FMCG norms database, so results are judged against category standards, not in isolation.',
    metaDescription: 'FMCG market research — concept testing, packaging studies, and brand health tracking for consumer goods brands.',
    keywords: 'FMCG market research, consumer goods research, concept testing, brand tracking',
  },
];

async function upsertIndustries(strapi: any) {
  for (const industry of INDUSTRIES_SEED) {
    const slug = slugifyTitle(industry.title);
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
        blocks: buildResearchBlocks(industry.title, industry),
        seo: buildResearchSeo(industry.title, industry),
      },
      true // published — fully content-enriched, per content-enrichment request
    );
  }

  strapi.log.info(
    `[seed] Industries: ${INDUSTRIES_SEED.length} upserted and published, each with 5 content blocks + SEO. Corrected sheet typo: "FMCG Market Rsearch" -> "FMCG Market Research".`
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

const ABOUT_CONTACT_SUBPAGES: AboutContactPageSeed[] = [
  {
    slug: 'our-company',
    title: 'Our Company',
    summary: 'Unimrkt Research is a global market research and consulting firm founded to help organizations make evidence-based decisions through rigorous data collection, analysis, and strategic insight.',
    overview: 'Founded with a mission to bring methodological rigor and genuine client partnership to market research, Unimrkt Research has grown into a full-service research firm spanning primary and secondary research, data analytics, and strategic consulting. Our teams combine deep category expertise with a global fieldwork network spanning 90+ countries.',
    stats: [['16+', 'Years in business'], ['90+', 'Countries served'], ['500+', 'Clients served'], ['200+', 'Research professionals']],
    useCases: 'Our multidisciplinary teams support clients across consumer, B2B, healthcare, and public-sector research — from single ad-hoc studies to ongoing tracking programs and embedded research partnerships.',
    ctaHeading: 'Want to know more about our company?',
    ctaBody: 'Get in touch to learn how we can support your next research initiative.',
    ctaLabel: 'Contact Our Team',
    methodology: 'Every project is led by a named research director with category expertise, supported by dedicated operations, analytics, and quality-assurance teams working to a documented methodology at every stage.',
    metaDescription: 'Learn about Unimrkt Research — a global market research and consulting firm delivering evidence-based insight across 90+ countries.',
    keywords: 'about unimrkt research, market research company, research firm',
  },
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
  {
    slug: 'work-with-us',
    title: 'Work with us',
    summary: 'Work with us — Unimrkt Research is always looking for talented researchers, data scientists, and fieldwork specialists who care about rigorous, client-focused research.',
    overview: 'We hire for category expertise and analytical rigor as much as research-methods experience, building teams that can go deep on a client\'s specific industry rather than staying generalist. Open roles span research operations, data science, qualitative moderation, and account leadership.',
    stats: [['200+', 'Team members globally'], ['90+', 'Countries with local presence'], ['Remote-friendly', 'Roles available'], ['Continuous learning', 'Culture and investment']],
    useCases: "Whether you're an experienced research director or early in your analytics career, our team structure offers a path to deep category specialization.",
    ctaHeading: 'Interested in joining our team?',
    ctaBody: 'Reach out to learn about current opportunities at Unimrkt Research.',
    ctaLabel: 'Explore Careers',
    methodology: 'Our hiring process evaluates both analytical skill and category curiosity — we look for people who want to become genuine experts in the industries they research.',
    metaDescription: 'Careers at Unimrkt Research — join a global team of researchers, data scientists, and fieldwork specialists.',
    keywords: 'careers at unimrkt research, work with us, research jobs',
  },
];

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

async function resetContent(strapi: any) {
  strapi.log.info('[seed] --reset: truncating content tables');
  await strapi.db.query('api::testimonial.testimonial').deleteMany({});
  await strapi.db.query('api::page.page').deleteMany({});
  await strapi.db.query('api::service.service').deleteMany({});
  await strapi.db.query('api::industry.industry').deleteMany({});
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
