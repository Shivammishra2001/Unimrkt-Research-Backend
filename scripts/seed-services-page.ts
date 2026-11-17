/**
 * Creates the editable "Services" page (slug `services`, Pages section) as
 * one self-contained section component per page section, with the images the
 * page ships with uploaded to the Media Library and already bound
 * (scripts/lib/services-page.ts).
 *
 * Safe by default: if the sectioned page already exists its text is never
 * overwritten — only empty image fields and missing sections are filled in.
 * Pass --force to rebuild it from scripts/seed-data/services-page.json.
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';
import { seedServicesPage } from './lib/services-page';

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  strapi.log.level = 'error';
  try {
    await seedServicesPage(strapi, process.argv.includes('--force'));
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[services-page] Failed:', err);
  process.exit(1);
});
