/**
 * Creates the editable "Industries" page (slug `industries`, Pages section) as
 * one self-contained section component per page section, with the images the
 * page ships with uploaded to the Media Library and already bound
 * (scripts/lib/industries-page.ts).
 *
 * Safe by default: if the sectioned page already exists it is left untouched,
 * so edits made in the admin are never overwritten. A page still in the old
 * single-block shape is rebuilt automatically. Pass --force to reset it.
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';
import { seedIndustriesPage } from './lib/industries-page';

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  strapi.log.level = 'error';
  try {
    await seedIndustriesPage(strapi, process.argv.includes('--force'));
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[industries-page] Failed:', err);
  process.exit(1);
});
