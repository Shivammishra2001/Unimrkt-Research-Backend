/**
 * Builds the sectioned "Industries" page (Pages > Industries, slug
 * `industries`) from scripts/seed-data/industries-page.json — the copy the
 * /industries frontend shipped with (Figma node 1384:26772) — and binds the
 * photos/icons the page already uses (scripts/seed-assets/industries/) to
 * their section's media fields, so editors open the entry with every image
 * already loaded.
 *
 * Shared by `npm run seed:industries-page` and `npm run seed`.
 */
import path from 'path';
import fs from 'fs';

const UID = 'api::page.page';
const ASSETS_DIR = path.join(__dirname, '..', 'seed-assets', 'industries');
const DATA_FILE = path.join(__dirname, '..', 'seed-data', 'industries-page.json');

// Icons by card position — the same order the frontend used for its built-in icons.
const ICONS = {
  beyond: ['beyond-infrastructure', 'beyond-repair', 'beyond-research', 'beyond-dashboard', 'beyond-configuration', 'beyond-growth'],
  insights: ['q-globe', 'q-user', 'q-ranking', 'q-product', 'q-review', 'q-trend'],
  cases: ['case-connection', 'case-cogwheel', 'case-insight'],
  reach: ['stat-global-network', 'stat-communications', 'stat-world', 'stat-search'],
  process: ['process-clipboard', 'process-brush', 'process-presentation', 'process-chart'],
};

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

/** Matched by filename, so re-running never duplicates Media Library entries. */
async function uploadAsset(strapi: any, filename: string): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;

  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    strapi.log.warn(`[industries-page] asset "${filename}" not found — field left empty`);
    return null;
  }
  const mime = MIME[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: {},
    files: {
      path: filePath,
      filepath: filePath,
      name: filename,
      originalFilename: filename,
      type: mime,
      mimetype: mime,
      size: fs.statSync(filePath).size,
    },
  });
  return uploaded?.id ?? null;
}

export async function seedIndustriesPage(strapi: any, force = false): Promise<void> {
  const c = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  const img = (name: string) => uploadAsset(strapi, `industries-${name}`);
  const existing = await strapi.documents(UID).findFirst({ filters: { slug: 'industries' }, populate: { blocks: true } });
  const sectioned = existing?.blocks?.some((b: any) => b.__component === 'industries-page.hero');
  if (existing && sectioned && !force) {
    await fillEmptyImages(strapi, existing.documentId, img);
    return;
  }

  const icon = (name: string) => uploadAsset(strapi, `industries-icon-${name}.svg`);
  const cards = async (items: Array<{ title: string; body: string }>, icons: string[]) =>
    Promise.all(items.map(async (it, i) => ({ title: it.title, body: it.body, icon: await icon(icons[i % icons.length]) })));

  const seo = {
    metaTitle: 'Industries',
    metaDescription: 'Data-driven market research solutions tailored to the unique challenges of your industry.',
  };

  // Sections in the exact top-to-bottom order the page renders them.
  const blocks = [
    {
      __component: 'industries-page.hero',
      eyebrow: c.heroEyebrow,
      heading: c.heroHeading,
      subheading: c.heroSubheading,
      image: await img('hero.webp'),
      primaryCta: c.heroPrimaryCta,
      secondaryCta: c.heroSecondaryCta,
    },
    {
      __component: 'industries-page.intro',
      eyebrow: c.introEyebrow,
      heading: c.introHeading,
      body: c.introBody,
      image: await img('worker-cutout.webp'),
    },
    {
      __component: 'industries-page.grid',
      eyebrow: c.gridEyebrow,
      heading: c.gridHeading,
      body: c.gridBody,
      backgroundImage: await img('wave-pattern.png'),
      cardFallbackImage: await img('card-fallback.jpg'),
    },
    {
      __component: 'industries-page.beyond',
      eyebrow: c.beyondEyebrow,
      heading: c.beyondHeading,
      body: c.beyondBody,
      cards: await cards(c.beyondCards, ICONS.beyond),
    },
    {
      __component: 'industries-page.band',
      heading: c.bandHeading,
      body: c.bandBody,
      backgroundImage: await img('texture.jpg'),
      personImage: await img('couple-cutout.webp'),
      cta: c.bandCta,
    },
    {
      __component: 'industries-page.insights',
      eyebrow: c.insightsEyebrow,
      heading: c.insightsHeading,
      body: c.insightsBody,
      backgroundImage: await img('woman-panel-bg.png'),
      cutoutImage: await img('woman-cutout.webp'),
      items: await cards(c.insightsItems, ICONS.insights),
    },
    {
      __component: 'industries-page.cases',
      eyebrow: c.casesEyebrow,
      heading: c.casesHeading,
      body: c.casesBody,
      cards: await cards(c.caseCards, ICONS.cases),
    },
    {
      __component: 'industries-page.reach',
      eyebrow: c.reachEyebrow,
      heading: c.reachHeading,
      body: c.reachBody,
      stats: await Promise.all(
        c.reachStats.map(async (s: { value: string; label: string }, i: number) => ({ ...s, icon: await icon(ICONS.reach[i % ICONS.reach.length]) }))
      ),
    },
    {
      __component: 'industries-page.process',
      eyebrow: c.processEyebrow,
      heading: c.processHeading,
      body: c.processBody,
      steps: await cards(c.processSteps, ICONS.process),
    },
    {
      __component: 'industries-page.testimonials',
      eyebrow: c.testimonialsEyebrow,
      heading: c.testimonialsHeading,
      backgroundWavesImage: await img('process-bg.jpg'),
      items: c.testimonials,
    },
    {
      __component: 'industries-page.faq',
      cta: c.faqCta,
      heading: c.faqHeading,
      items: c.faqItems,
    },
    {
      __component: 'industries-page.about',
      eyebrow: c.aboutEyebrow,
      heading: c.aboutHeading,
      body: c.aboutBody,
    },
    {
      __component: 'industries-page.final-cta',
      heading: c.finalCtaHeading,
      body: c.finalCtaBody,
      image: await img('cta-people.jpg'),
      action: c.finalCtaAction,
    },
  ];

  const data = { title: 'Industries', slug: 'industries', seo, blocks };
  const doc = existing
    ? await strapi.documents(UID).update({ documentId: existing.documentId, data })
    : await strapi.documents(UID).create({ data });
  await strapi.documents(UID).publish({ documentId: doc.documentId });
  // eslint-disable-next-line no-console
  console.log(`[industries-page] ${existing ? 'Rebuilt' : 'Created'} and published the "industries" page with ${blocks.length} sections and its images bound.`);
}

// Image field -> shipped default, per section. Used to top up a page whose editor
// has not set that image yet (e.g. a field added in a later release).
const DEFAULT_IMAGES: Record<string, Record<string, string>> = {
  'industries-page.hero': { image: 'hero.webp' },
  'industries-page.intro': { image: 'worker-cutout.webp' },
  'industries-page.grid': { backgroundImage: 'wave-pattern.png', cardFallbackImage: 'card-fallback.jpg' },
  'industries-page.band': { backgroundImage: 'texture.jpg', personImage: 'couple-cutout.webp' },
  'industries-page.insights': { backgroundImage: 'woman-panel-bg.png', cutoutImage: 'woman-cutout.webp' },
  'industries-page.testimonials': { backgroundWavesImage: 'process-bg.jpg' },
  'industries-page.final-cta': { image: 'cta-people.jpg' },
};

/** Media objects -> their ids, so a populated block can be written back as input. */
function toInput(value: any): any {
  if (Array.isArray(value)) return value.map(toInput);
  if (value && typeof value === 'object') {
    if (typeof value.mime === 'string' && typeof value.url === 'string') return value.id;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (['documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale'].includes(k)) continue;
      out[k] = toInput(v);
    }
    return out;
  }
  return value;
}

/** Non-destructive: keeps every text edit and every image an editor chose, and only
 * binds the shipped image where a section's image field is still empty. */
async function fillEmptyImages(strapi: any, documentId: string, img: (n: string) => Promise<number | null>) {
  const { buildPagePopulate } = require('../../src/api/page/services/page');
  const page = await strapi.documents(UID).findOne({ documentId, populate: buildPagePopulate() });
  let filled = 0;
  const blocks = await Promise.all(
    (page.blocks ?? []).map(async (block: any) => {
      const input = toInput(block);
      for (const [field, file] of Object.entries(DEFAULT_IMAGES[block.__component] ?? {})) {
        if (block[field]) continue;
        const id = await img(file);
        if (id) {
          input[field] = id;
          filled += 1;
        }
      }
      return input;
    })
  );
  if (filled === 0) {
    // eslint-disable-next-line no-console
    console.log('[industries-page] Page already exists and every image is set — left untouched (use --force to reset it).');
    return;
  }
  await strapi.documents(UID).update({ documentId, data: { blocks } });
  await strapi.documents(UID).publish({ documentId });
  // eslint-disable-next-line no-console
  console.log(`[industries-page] Kept all existing content; bound ${filled} missing image(s) and re-published.`);
}
