/**
 * Creates the editable "Industries" page (slug `industries`, Pages section)
 * from scripts/seed-data/industries-page.json — the exact copy the
 * /industries frontend shipped with (Figma node 1384:26772).
 *
 * Safe by default: if the page already exists it is left untouched, so
 * edits made in the admin are never overwritten. Pass --force to reset it
 * to the shipped copy.
 */
import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';

const UID = 'api::page.page';

async function main() {
  const force = process.argv.includes('--force');
  const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data', 'industries-page.json'), 'utf-8'));

  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  strapi.log.level = 'error';

  try {
    const existing = await strapi.documents(UID).findFirst({ filters: { slug: 'industries' } });
    if (existing && !force) {
      // eslint-disable-next-line no-console
      console.log('[industries-page] Page already exists — left untouched (use --force to reset it).');
      return;
    }
    const seo = {
      metaTitle: 'Industries',
      metaDescription: 'Data-driven market research solutions tailored to the unique challenges of your industry.',
    };
    const data = {
      title: 'Industries',
      slug: 'industries',
      seo,
      blocks: [{ __component: 'page-content.industries', ...content, seo }],
    };
    const doc = existing
      ? await strapi.documents(UID).update({ documentId: existing.documentId, data })
      : await strapi.documents(UID).create({ data });
    await strapi.documents(UID).publish({ documentId: doc.documentId });
    // eslint-disable-next-line no-console
    console.log(`[industries-page] ${existing ? 'Reset' : 'Created'} and published the "industries" page.`);
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[industries-page] Failed:', err);
  process.exit(1);
});
