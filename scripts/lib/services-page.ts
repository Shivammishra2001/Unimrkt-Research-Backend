/**
 * Builds the sectioned "Services" page (Pages > Services, slug `services`) from scripts/seed-data/services-page.json —
 * the copy the /services frontend ships with (Figma node 1231:77069; generated from the frontend's
 * SERVICES_LISTING_FALLBACK, so the two never drift) — and binds the photos/icons the page uses
 * (scripts/seed-assets/services/) to their section's media fields, so editors open the entry with every image loaded.
 *
 * Same shape and safety rules as scripts/lib/industries-page.ts:
 *   - no entry yet          -> create + publish it with every section;
 *   - entry already exists  -> never overwrite text an editor wrote; only bind shipped images to empty image fields
 *                              and append any section block that is missing entirely (e.g. added in a later release);
 *   - --force               -> rebuild the entry from the seed data (discards admin edits).
 *
 * Shared by `npm run seed:services-page` and `npm run seed`.
 */
import path from 'path';
import fs from 'fs';

const UID = 'api::page.page';
const SLUG = 'services';
const ASSETS_DIR = path.join(__dirname, '..', 'seed-assets', 'services');
const DATA_FILE = path.join(__dirname, '..', 'seed-data', 'services-page.json');

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
    strapi.log.warn(`[services-page] asset "${filename}" not found — field left empty`);
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

const img = (strapi: any, name: string) => uploadAsset(strapi, `services-${name}`);
const icon = (strapi: any, name: string) => uploadAsset(strapi, `services-icon-${name}`);

/** Every section block, in the exact top-to-bottom order the page renders them. */
async function buildBlocks(strapi: any): Promise<any[]> {
  const c = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const cards = (items: Array<{ title: string; body: string; icon: string }>) =>
    Promise.all(items.map(async (it) => ({ title: it.title, body: it.body, icon: await icon(strapi, it.icon) })));

  return [
    { __component: 'services-page.hero', ...c.hero, image: await img(strapi, 'hero.webp') },
    { __component: 'services-page.intro', ...c.intro, image: await img(strapi, 'about-colleagues.webp') },
    { __component: 'services-page.showcase', ...c.showcase },
    {
      __component: 'services-page.why',
      heading: c.why.heading,
      body: c.why.body,
      stats: await Promise.all(c.why.stats.map(async (s: any) => ({ value: s.value, label: s.label, icon: await icon(strapi, s.icon) }))),
    },
    { __component: 'services-page.process', eyebrow: c.process.eyebrow, heading: c.process.heading, body: c.process.body, steps: await cards(c.process.steps) },
    { __component: 'services-page.band', ...c.band, personImage: await img(strapi, 'question-couple.webp') },
    { __component: 'services-page.coverage', eyebrow: c.coverage.eyebrow, heading: c.coverage.heading, body: c.coverage.body, cards: await cards(c.coverage.cards) },
    { __component: 'services-page.industries', ...c.industries },
    {
      __component: 'services-page.case-band',
      ...c.caseBand,
      personImage: await img(strapi, 'case-person.webp'),
      chartImage: await img(strapi, 'case-analysis.png'),
    },
    { __component: 'services-page.testimonials', ...c.testimonials },
    { __component: 'services-page.faq', ...c.faq },
    { __component: 'services-page.about', ...c.about },
    { __component: 'services-page.final-cta', ...c.finalCta, image: await img(strapi, 'cta-people.jpg') },
  ];
}

// Image field -> shipped default, per section: used to top up an existing entry whose editor has not set that image.
const DEFAULT_IMAGES: Record<string, Record<string, string>> = {
  'services-page.hero': { image: 'hero.webp' },
  'services-page.intro': { image: 'about-colleagues.webp' },
  'services-page.band': { personImage: 'question-couple.webp' },
  'services-page.case-band': { personImage: 'case-person.webp', chartImage: 'case-analysis.png' },
  'services-page.final-cta': { image: 'cta-people.jpg' },
};

/** Media objects -> their ids, so a populated block can be written back as input. */
function toInput(value: any): any {
  if (Array.isArray(value)) return value.map(toInput);
  if (value && typeof value === 'object') {
    if (typeof value.mime === 'string' && typeof value.url === 'string') return value.id;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale'].includes(k)) continue;
      out[k] = toInput(v);
    }
    return out;
  }
  return value;
}

/** Non-destructive top-up of an existing entry: keeps every edit, binds shipped images to empty image fields and
 * appends any section the entry lacks. */
async function topUp(strapi: any, documentId: string): Promise<void> {
  const { buildPagePopulate } = require('../../src/api/page/services/page');
  const page = await strapi.documents(UID).findOne({ documentId, populate: buildPagePopulate() });
  const current: any[] = page?.blocks ?? [];
  let filled = 0;
  const blocks = await Promise.all(
    current.map(async (block: any) => {
      const input = toInput(block);
      for (const [field, file] of Object.entries(DEFAULT_IMAGES[block.__component] ?? {})) {
        if (block[field]) continue;
        const id = await img(strapi, file);
        if (id) {
          input[field] = id;
          filled += 1;
        }
      }
      return input;
    })
  );
  const have = new Set(current.map((b) => b.__component));
  const missing = (await buildBlocks(strapi)).filter((b) => !have.has(b.__component));
  if (filled === 0 && missing.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[services-page] Page already exists with every section and image set — left untouched (use --force to reset it).');
    return;
  }
  await strapi.documents(UID).update({ documentId, data: { blocks: [...blocks, ...missing] } });
  await strapi.documents(UID).publish({ documentId });
  // eslint-disable-next-line no-console
  console.log(`[services-page] Kept all existing content; bound ${filled} missing image(s), added ${missing.length} missing section(s) and re-published.`);
}

export async function seedServicesPage(strapi: any, force = false): Promise<void> {
  const existing = await strapi.documents(UID).findFirst({ filters: { slug: SLUG }, populate: { blocks: true } });
  const sectioned = existing?.blocks?.some((b: any) => typeof b.__component === 'string' && b.__component.startsWith('services-page.'));
  if (existing && sectioned && !force) {
    await topUp(strapi, existing.documentId);
    return;
  }
  if (existing && !sectioned && !force) {
    // A `services` page that predates these sections (none on this site today) is never replaced silently.
    // eslint-disable-next-line no-console
    console.log('[services-page] A "services" page exists without services-page sections — left untouched (use --force to rebuild it).');
    return;
  }

  const blocks = await buildBlocks(strapi);
  const seo = {
    metaTitle: 'Services',
    metaDescription: 'Helping organizations transform data into actionable insights through comprehensive market research and business intelligence.',
  };
  const data = { title: 'Services', slug: SLUG, isActive: true, seo, blocks };
  const doc = existing
    ? await strapi.documents(UID).update({ documentId: existing.documentId, data })
    : await strapi.documents(UID).create({ data });
  await strapi.documents(UID).publish({ documentId: doc.documentId });
  // eslint-disable-next-line no-console
  console.log(`[services-page] ${existing ? 'Rebuilt' : 'Created'} and published the "services" page with ${blocks.length} sections and its images bound.`);
}
