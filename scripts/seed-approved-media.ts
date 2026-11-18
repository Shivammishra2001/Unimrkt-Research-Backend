/**
 * Replaces the original seed PLACEHOLDER media in a few fields with the approved Figma artwork, so the frontend can let
 * Strapi win for those fields without the page changing:
 *
 *   Global → Logo                                   logo-nav.png            -> brand-logo.png (the approved oval logo)
 *   Contact / Work With Us / Privacy Policy → Hero  *-hero-bg.* (pre-darkened 1900px frame exports) -> the raw photos
 *   Home FAQ block → Background                     faq-worldmap-bg.png (pre-faded export) -> faq-worldmap.png
 *   Industries page → Testimonials waves image      industries-process-bg.jpg (wrong image) -> industries-client-waves.png
 *   Services (5 Figma categories) → Thumbnail       generic stock placeholders -> the Figma panel photos
 *
 * Safe: a field is replaced ONLY when it still holds one of the listed placeholder files (matched by the file's
 * original name) or — except where an empty field is meaningful, like the FAQ map — is empty, so anything an editor has
 * uploaded is never touched. Updates go straight to the stored rows
 * (draft and published alike), so nothing is republished and no dynamic zone is rewritten. Idempotent; refreshes the
 * site cache for the affected pages when something changed.
 *
 * Run once per environment:  npm run seed:approved-media
 */
import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';
import { notifyRevalidate } from '../src/utils/revalidate';

const ASSETS_DIR = path.join(__dirname, 'seed-assets', 'approved');

const SERVICE_PLACEHOLDERS = [
  'blog-ai-workforce', 'services-earth', 'moments-small', 'blog-field-research', 'moments-large',
  'industry-banking', 'industry-cityscape', 'industry-retail',
].flatMap((n) => [`${n}.png`, `${n}.jpg`]);

interface Binding {
  label: string;
  uid: string;
  field: string;
  file: string;
  placeholders: string[];
  /** Restrict to rows matching this (content types only), e.g. a service slug. */
  where?: Record<string, unknown>;
  /** Also fill rows where the field is empty (default). Off where "empty" is meaningful, e.g. the FAQ map layer. */
  fillEmpty?: boolean;
  tags: string[];
}

const BINDINGS: Binding[] = [
  { label: 'Global logo', uid: 'api::global.global', field: 'logo', file: 'brand-logo.png', placeholders: ['logo-nav.png'], tags: ['global'] },
  { label: 'Contact hero', uid: 'page-content.contact', field: 'heroImage', file: 'contact-hero-photo.jpg', placeholders: ['contact-hero-bg.jpg'], tags: ['pages', 'page-contact'] },
  { label: 'Work With Us hero', uid: 'page-content.work-with-us', field: 'heroImage', file: 'work-with-us-hero.png', placeholders: ['wwu-hero-bg.jpg'], tags: ['pages', 'page-work-with-us'] },
  { label: 'Privacy Policy hero', uid: 'page-content.privacy-policy', field: 'heroImage', file: 'privacy-policy-hero.jpg', placeholders: ['pp-hero-bg.jpg'], tags: ['pages', 'page-privacy-policy'] },
  // An FAQ block without a background shows no map at all, so only the placeholder is ever replaced here.
  { label: 'FAQ world map', uid: 'blocks.faq', field: 'background', file: 'faq-worldmap.png', placeholders: ['faq-worldmap-bg.png'], fillEmpty: false, tags: ['pages', 'page-home'] },
  { label: 'Industries testimonials waves', uid: 'industries-page.testimonials', field: 'backgroundWavesImage', file: 'industries-client-waves.png', placeholders: ['industries-process-bg.jpg'], tags: ['pages', 'page-industries'] },
  ...(
    [
      ['primary-research', 'services-panel-primary.webp'],
      ['qualitative-research', 'services-panel-qualitative.webp'],
      ['quantitative-research', 'services-panel-quantitative.webp'],
      ['business-research', 'services-panel-business.webp'],
      ['research-support-functions', 'services-panel-support.webp'],
    ] as const
  ).map(([slug, file]) => ({
    label: `Service thumbnail (${slug})`,
    uid: 'api::service.service',
    field: 'thumbnail',
    file,
    placeholders: SERVICE_PLACEHOLDERS,
    where: { slug },
    tags: ['services', `service-${slug}`],
  })),
];

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

async function upload(strapi: any, filename: string): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.warn(`[approved-media] missing asset ${filePath}`);
    return null;
  }
  const mime = MIME[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: { fileInfo: { name: filename, alternativeText: '' } },
    files: { path: filePath, filepath: filePath, name: filename, originalFilename: filename, type: mime, mimetype: mime, size: fs.statSync(filePath).size },
  });
  return uploaded?.id ?? null;
}

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  const tags = new Set<string>();
  try {
    for (const b of BINDINGS) {
      const rows = await strapi.db.query(b.uid).findMany({ where: b.where ?? {}, populate: { [b.field]: true } });
      const targets = rows.filter((r: any) => (r[b.field] ? b.placeholders.includes(r[b.field].name) : b.fillEmpty !== false));
      if (rows.length === 0) {
        // eslint-disable-next-line no-console
        console.log(`[approved-media] ${b.label}: no rows — skipped`);
        continue;
      }
      if (targets.length === 0) {
        // eslint-disable-next-line no-console
        console.log(`[approved-media] ${b.label}: already set by an editor or done — unchanged`);
        continue;
      }
      const fileId = await upload(strapi, b.file);
      if (!fileId) continue;
      for (const row of targets) {
        if (row[b.field]?.id === fileId) continue;
        await strapi.db.query(b.uid).update({ where: { id: row.id }, data: { [b.field]: fileId } });
      }
      b.tags.forEach((t) => tags.add(t));
      // eslint-disable-next-line no-console
      console.log(`[approved-media] ${b.label}: ${targets.length} row(s) -> ${b.file}`);
    }
    for (const t of tags) await notifyRevalidate(t);
    // eslint-disable-next-line no-console
    console.log(`[approved-media] done${tags.size ? ` — refreshed: ${[...tags].join(', ')}` : ' — nothing to change'}`);
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error('[approved-media] failed:', err);
    process.exit(1);
  },
);
