/**
 * Pre-fills the four Level-3 sections (Why, What We Can Measure, Quality First, Technology panels) on every
 * sub-service (a Service with a parent), so editors see real, editable values in the admin instead of empty fields.
 * telephonic-surveys gets the approved Figma copy; every other sub-service (e.g. cati-surveys) gets the template copy
 * with its own title worked in — the same copy the frontend already shows as its fallback.
 *
 * Safe and idempotent: a section is written only while ALL of its fields are empty; anything an editor has filled is
 * left alone. Entries are republished only when something changed.
 *
 * Run once per environment:  npm run seed:subservice-sections
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';
import { genericSections, sectionData, SECTION_POPULATE, telephonicSections } from './lib/subservice-sections';

const UID = 'api::service.service';

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  try {
    const subServices = await strapi.documents(UID).findMany({
      status: 'draft',
      filters: { parent: { id: { $notNull: true } } },
      populate: SECTION_POPULATE,
      limit: 500,
    });
    let changed = 0;
    for (const entry of subServices) {
      const copy = entry.slug === 'telephonic-surveys' ? telephonicSections() : genericSections(entry.title);
      const { data, written } = await sectionData(strapi, entry, copy);
      if (written.length === 0) {
        // eslint-disable-next-line no-console
        console.log(`[subservice-sections] ${entry.slug}: already filled — unchanged`);
        continue;
      }
      // Republish only an entry that is already live — never publish a draft-only sub-service.
      const live = await strapi.documents(UID).findOne({ documentId: entry.documentId, status: 'published', fields: ['id'] });
      await strapi.documents(UID).update({ documentId: entry.documentId, data });
      if (live) await strapi.documents(UID).publish({ documentId: entry.documentId });
      changed += 1;
      // eslint-disable-next-line no-console
      console.log(`[subservice-sections] ${entry.slug}: filled ${written.join(', ')}`);
    }
    // eslint-disable-next-line no-console
    console.log(`[subservice-sections] done — ${changed} of ${subServices.length} sub-services updated`);
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error('[subservice-sections] failed:', err);
    process.exit(1);
  },
);
