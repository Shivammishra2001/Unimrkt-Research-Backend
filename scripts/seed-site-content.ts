/**
 * Fills the content fields added in audit batch 3 with the copy and artwork the site shows today, so editors start
 * from real values and nothing changes on the page:
 *
 *   Pages → Blogs (slug "blogs")      created if missing: listing hero, grid heading/intro, FAQ, About, post-page labels
 *   Pages → Gallery (slug "gallery")  created if missing: hero, grid heading, closing-CTA artwork
 *   Pages → Contact                   "Why work with Unimrkt" (+4 cards), "How it works" (+4 steps), About text
 *   Global                            footer badges, "Connect with us" heading, chat widget copy, mega-menu "Overview"
 *   Services                          listing panel descriptions/icons, Level-2 methodologies body
 *   Pages → Services (showcase)       "Explore Research" button label
 *
 * Safe:
 *   - Every field is written only while it is empty; an editor's text or upload is never overwritten.
 *   - New page records are created with "Show in header" OFF, so the header auto-add never picks them up.
 *   - Text fields inside page sections are written straight to their stored rows (draft and published), so nothing is
 *     republished. The Contact cards/steps (nested lists) need the page saved through Strapi; that page is republished
 *     only when it has no unpublished draft edits — otherwise only its draft is updated and the run says so.
 *   - Idempotent. Refreshes the site cache for what changed.
 *
 * Run once per environment:  npm run seed:site-content
 */
import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';
import { notifyRevalidate } from '../src/utils/revalidate';
import { buildPagePopulate } from '../src/api/page/services/page';

const ASSETS = path.join(__dirname, 'seed-assets', 'site-content');
const PAGE = 'api::page.page';
const tags = new Set<string>();
const log = (msg: string) => console.log(`[site-content] ${msg}`); // eslint-disable-line no-console
const blank = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
const link = (label: string, href: string, variant = 'primary') => ({ label, href, isExternal: false, variant });

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
async function upload(strapi: any, filename: string, alt = ''): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;
  const filePath = path.join(ASSETS, filename);
  if (!fs.existsSync(filePath)) {
    log(`missing asset ${filePath}`);
    return null;
  }
  const mime = MIME[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
  const [file] = await strapi.plugin('upload').service('upload').upload({
    data: { fileInfo: { name: filename, alternativeText: alt } },
    files: { path: filePath, filepath: filePath, name: filename, originalFilename: filename, type: mime, mimetype: mime, size: fs.statSync(filePath).size },
  });
  return file?.id ?? null;
}

/** Fill empty scalar fields on every stored row of a component / content type (draft + published), no republish. */
async function fillRows(strapi: any, uid: string, values: Record<string, unknown>, where: Record<string, unknown> = {}) {
  const rows = await strapi.db.query(uid).findMany({ where });
  let changed = 0;
  for (const row of rows) {
    const data = Object.fromEntries(Object.entries(values).filter(([k]) => blank(row[k])));
    if (Object.keys(data).length === 0) continue;
    await strapi.db.query(uid).update({ where: { id: row.id }, data });
    changed += 1;
  }
  return changed;
}

/** Turn a fully populated entry back into Document Service input: media -> ids, relations -> documentIds, system keys dropped. */
function toInput(value: any): any {
  if (Array.isArray(value)) return value.map(toInput);
  if (!value || typeof value !== 'object') return value;
  if (value.mime && value.url && value.hash) return value.id; // media
  if (value.documentId && !value.__component) return value.documentId; // relation
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (['createdAt', 'updatedAt', 'publishedAt', 'locale', 'localizations', 'createdBy', 'updatedBy'].includes(k)) continue;
    out[k] = toInput(v);
  }
  return out;
}

async function createPage(strapi: any, slug: string, title: string, block: Record<string, unknown>) {
  const existing = await strapi.documents(PAGE).findFirst({ filters: { slug }, status: 'draft' });
  if (existing) {
    log(`Pages → ${title}: already exists — unchanged`);
    return;
  }
  const doc = await strapi.documents(PAGE).create({ data: { title, slug, isActive: true, showInHeader: false, blocks: [block] } });
  await strapi.documents(PAGE).publish({ documentId: doc.documentId });
  tags.add('pages').add(`page-${slug}`);
  log(`Pages → ${title}: created and published (slug "${slug}", not in the header)`);
}

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  try {
    // --- Pages → Blogs ---------------------------------------------------------------------------------------------
    await createPage(strapi, 'blogs', 'Blogs', {
      __component: 'page-content.blog',
      heroEyebrow: 'Our Blog',
      heroHeading: 'Market Research\nInsights & Industry Trends',
      heroSubheading: 'Stay informed with expert articles, research methodologies, industry trends, customer insights, and business intelligence from Unimrkt Research.',
      heroCta: link('Talk to Our Experts', '/contact'),
      heroImage: await upload(strapi, 'blogs-hero.jpg'),
      gridHeading: 'Insights & Stories',
      gridIntro: 'Explore expert insights, industry trends, research methodologies, and success stories designed to help businesses stay informed, uncover opportunities, make data-driven decisions, and achieve sustainable growth.',
      faqItems: [
        { question: 'What topics does the Unimrkt Research Blog cover?', answer: 'The blog covers market research methodologies, industry trends, consumer behavior, business strategy, and emerging opportunities across the sectors Unimrkt Research serves.' },
        { question: 'Who should read the Unimrkt Research Blog?', answer: 'Business leaders, marketers, product teams, and researchers looking for practical, data-driven perspective on markets, customers, and research best practices.' },
        { question: 'How often is new content published?', answer: 'New articles are published regularly, drawing on ongoing research engagements and industry developments as they happen.' },
        { question: 'Are the blog articles based on industry expertise?', answer: 'Yes — every article is written or reviewed by researchers and analysts who work directly on the studies and engagements the content is based on.' },
        { question: 'How can the Unimrkt Research Blog help my business?', answer: 'It helps you spot emerging trends earlier, benchmark against research best practices, and make market-entry and strategy decisions with more confidence.' },
      ],
      aboutEyebrow: 'About Our Blog',
      aboutHeading: 'Insights That Drive Smarter Business Decisions',
      aboutBody:
        'Welcome to the Unimrkt Research Blog, your trusted source for the latest market research insights, industry trends, and expert perspectives. From primary research methodologies and consumer behavior to business strategy and emerging market opportunities, our articles are designed to help organizations make informed, data-driven decisions.\n\n' +
        'Explore practical guides, research best practices, case studies, and thought leadership from experienced industry professionals. Whether you’re a business leader, marketer, or researcher, our blog delivers valuable knowledge to help you understand markets, uncover opportunities, and stay ahead in today’s competitive business landscape.',
      postRelatedEyebrow: 'Other Blogs',
      postQuickEnquiryHeading: 'Quick Enquiry',
      postQuickEnquirySubheading: 'Customer Service, We Make it Better',
      postRecentPostsHeading: 'Recent Posts',
      postShareLabel: 'Share',
    });

    // --- Pages → Gallery -------------------------------------------------------------------------------------------
    await createPage(strapi, 'gallery', 'Gallery', {
      __component: 'page-content.gallery',
      heroEyebrow: 'Our Gallery',
      heroHeading: 'Moments that\nshow our journey',
      heroSubheading: 'Explore our gallery to see the people, processes and projects that drive our research excellence.',
      heroImage: await upload(strapi, 'gallery-hero.jpg'),
      gridHeading: 'Our Gallery',
      finalCtaImage: await upload(strapi, 'gallery-cta.jpg'),
    });

    // --- Pages → Contact: section text (rows) ----------------------------------------------------------------------
    const contactText = await fillRows(strapi, 'page-content.contact', {
      whyEyebrow: 'Why work with unimrkt?',
      whyHeading: 'More Than Research.\nA Partner For Better Decisions.',
      whyBody: 'From defining the research question to delivering actionable insights, our team combines research expertise, technology and global field capabilities to support better business decisions.',
      howEyebrow: 'How it works',
      howHeading: 'What Happens After You Contact Us?',
      howIntro: 'A simple process designed to understand your requirement and connect you with the right research expertise.',
      aboutEyebrow: 'Contact Us',
      aboutHeading: 'Have a Research Question? Let’s Talk.',
      aboutBody:
        'Tell us what you’re trying to understand—whether it’s a market opportunity, customer behaviour, industry trend, competitive landscape or a specific business challenge. Our team takes the time to understand your objectives, target audience and desired outcomes before recommending the right research approach, methodology and scope. From focused studies to complex multi-market research programs, we help businesses ask the right questions and uncover meaningful insights.\n\n' +
        'Our capabilities span qualitative and quantitative research, B2B, healthcare, consumer research, CATI and global research across diverse industries and audiences. With experienced researchers, robust quality processes, technology-enabled execution and a global network, we deliver reliable insights that can support confident business decisions. Share your research requirement with us, and our experts will work with you to shape a practical, focused solution aligned with your goals, timelines and market needs. Let’s start a conversation and discover the right research path for your business.',
    });
    if (contactText) tags.add('pages').add('page-contact');
    log(`Pages → Contact: section text filled on ${contactText} row(s)`);

    // --- Pages → Contact: cards + steps (nested lists → save through Strapi) ----------------------------------------
    const contactDraft = await strapi.documents(PAGE).findFirst({ filters: { slug: 'contact' }, status: 'draft', populate: (buildPagePopulate() as any) });
    const block = contactDraft?.blocks?.find((b: any) => b.__component === 'page-content.contact');
    if (block && (blank(block.whyCards) || blank(block.howSteps))) {
      const blocks = toInput(contactDraft.blocks).map((b: any) =>
        b.__component !== 'page-content.contact'
          ? b
          : {
              ...b,
              ...(blank(block.whyCards)
                ? {
                    whyCards: [
                      { title: 'Deep Research\nExpertise', description: 'Experienced researchers who understand complex business questions and diverse audiences.', iconIdentifier: 'research' },
                      { title: 'Global Reach', description: 'Research capabilities across markets, industries, audiences and geographies.', iconIdentifier: 'global' },
                      { title: 'Quality-First\nApproach', description: 'Rigorous processes designed to ensure reliable, accurate and actionable research.', iconIdentifier: 'badge' },
                      { title: 'Business-Focused\nInsights', description: 'We turn research findings into insights that can support meaningful business decisions.', iconIdentifier: 'dashboard' },
                    ],
                  }
                : {}),
              ...(blank(block.howSteps)
                ? {
                    howSteps: [
                      { title: 'Share Your Requirement', description: 'Tell us about your business question, target audience, market or research objective.' },
                      { title: 'Discuss Your Objectives', description: 'Our team connects with you to understand the context, challenges and desired outcomes.' },
                      { title: 'Define The Approach', description: 'We recommend the appropriate methodology, audience, geography and research approach.' },
                      { title: 'Receive A Proposal', description: 'You receive a clear research plan aligned with your objectives, timelines and requirements.' },
                    ],
                  }
                : {}),
            },
      );
      const live = await strapi.documents(PAGE).findFirst({ filters: { slug: 'contact' }, status: 'published', fields: ['updatedAt'] });
      // Republish only when the draft carries no unpublished edits (its last save is not newer than the live version).
      const draftIsClean = live && new Date(contactDraft.updatedAt).getTime() <= new Date(live.updatedAt).getTime() + 1000;
      await strapi.documents(PAGE).update({ documentId: contactDraft.documentId, data: { blocks } });
      if (draftIsClean) {
        await strapi.documents(PAGE).publish({ documentId: contactDraft.documentId });
        tags.add('pages').add('page-contact');
        log('Pages → Contact: "Why" cards and "How it works" steps filled and published');
      } else {
        log('Pages → Contact: "Why" cards and "How it works" steps filled in the DRAFT only (the page has unpublished edits — publish it when ready)');
      }
    } else {
      log('Pages → Contact: cards and steps already set — unchanged');
    }

    // --- Global: footer badges, social heading, chat widget --------------------------------------------------------
    const G = 'api::global.global';
    const g = await strapi.documents(G).findFirst({ status: 'draft', populate: { footerBadges: true, chatWidget: { populate: { quickActions: true } } } });
    if (g) {
      const data: Record<string, unknown> = {};
      if (blank(g.footerBadges)) {
        const ids = [await upload(strapi, 'footer-badge-iso-1.png', 'ISO certification'), await upload(strapi, 'footer-badge-iso-2.png', 'ISO certification'), await upload(strapi, 'footer-badge-mrsi.png', 'MRSI member')].filter(Boolean);
        if (ids.length) data.footerBadges = ids;
      }
      if (blank(g.socialHeading)) data.socialHeading = 'Connect with us';
      if (!g.chatWidget) {
        data.chatWidget = {
          title: 'Chat with Unimrkt',
          status: 'Online',
          greeting: "👋 Hi there! I'm the Unimrkt Research assistant. How can we help with your market research needs today?",
          quickActions: [
            { label: 'Request a Quote', reply: "Happy to help — could you share a bit about the market or industry you'd like research on? Type it below and our team will follow up with a tailored quote." },
            { label: 'Speak with an Analyst', reply: 'Sure thing! Leave your question below and one of our research analysts will reach out to you directly.' },
            { label: 'General Enquiry', reply: "Of course — go ahead and type your question below, and we'll get back to you shortly." },
          ],
          placeholder: 'Type your message…',
          acknowledgement: "Thanks — we've received your message and a research consultant will be in touch shortly.",
        };
      }
      if (Object.keys(data).length) {
        const live = await strapi.documents(G).findFirst({ status: 'published', fields: ['id'] });
        await strapi.documents(G).update({ documentId: g.documentId, data });
        if (live) await strapi.documents(G).publish({ documentId: g.documentId });
        tags.add('global');
        log(`Global: filled ${Object.keys(data).join(', ')}`);
      } else log('Global: footer badges, social heading and chat widget already set — unchanged');
    }
    const overview = await fillRows(strapi, 'navigation.services-menu', { overviewLabel: 'Overview' });
    if (overview) tags.add('global');
    log(`Global → Services menu: "Overview" label filled on ${overview} row(s)`);

    // --- Services: listing panel copy/icons + Level-2 methodologies body -------------------------------------------
    const PANEL: Array<[string, string, string | null]> = [
      ['primary-research', 'services-icon-primary.svg', 'Gather first-hand insights from target audiences through qualitative and quantitative research. Understand customer needs, behaviours, attitudes and experiences to uncover meaningful insights and support confident business decisions.'],
      ['qualitative-research', 'services-icon-qualitative.svg', 'Explore the motivations, perceptions and experiences behind consumer behaviour through in-depth interviews, focus groups and interactive research methods that uncover deeper, meaningful insights.'],
      ['quantitative-research', 'services-icon-quantitative.svg', 'Measure market trends, customer behaviours and opinions at scale through structured surveys and data-driven research, delivering reliable insights that support strategic decisions and business growth.'],
      ['business-research', 'services-icon-business.svg', null],
      ['research-support-functions', 'services-icon-support.svg', null],
    ];
    let services = 0;
    for (const [slug, icon, description] of PANEL) {
      const rows = await strapi.db.query('api::service.service').findMany({ where: { slug }, populate: { listingIcon: true } });
      for (const row of rows) {
        const data: Record<string, unknown> = {};
        if (description && blank(row.listingDescription)) data.listingDescription = description;
        if (!row.listingIcon) {
          const id = await upload(strapi, icon);
          if (id) data.listingIcon = id;
        }
        if (Object.keys(data).length) {
          await strapi.db.query('api::service.service').update({ where: { id: row.id }, data });
          services += 1;
          tags.add('services').add(`service-${slug}`);
        }
      }
    }
    log(`Services: listing panel description/icon filled on ${services} row(s)`);
    const l2 = await fillRows(
      strapi,
      'api::service.service',
      { methodologiesBody: 'We leverage proven qualitative and quantitative research methodologies to collect accurate, reliable data, delivering actionable insights that support smarter decisions, innovation, and sustainable business growth.' },
      { parent: { id: { $null: true } } },
    );
    if (l2) tags.add('services');
    log(`Services (Level-2): methodologies body filled on ${l2} row(s)`);

    // --- Pages → Services: showcase button label --------------------------------------------------------------------
    const showcase = await fillRows(strapi, 'services-page.showcase', { ctaLabel: 'Explore Research' });
    if (showcase) tags.add('pages').add('page-services');
    log(`Pages → Services: showcase button label filled on ${showcase} row(s)`);

    for (const t of tags) await notifyRevalidate(t);
    log(`done${tags.size ? ` — refreshed: ${[...tags].join(', ')}` : ' — nothing to change'}`);
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('[site-content] failed:', err); // eslint-disable-line no-console
    process.exit(1);
  },
);
