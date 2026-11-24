/**
 * Sets the editor-controlled display `order` on the top-level Service categories that drive the
 * /services "End-to-End Market Research Solutions" card strip (GET /services/tree sorts by
 * `order:asc, title:asc`). Without a seeded order the strip falls back to pure alphabetical, which
 * pushes the newer AI / CX / Social cards ahead of the core research offerings — this restores the
 * Figma sequence (Primary, Qualitative, Quantitative, Business, Research Support first) and gives
 * editors a numeric handle they can change per card in Strapi Admin afterwards.
 *
 * Idempotent & non-destructive:
 *   - only the slugs below are touched; any other category keeps its current order (default 100),
 *   - an entry is updated only when its order actually differs (draft is updated, then republished
 *     if a published version exists), so an editor's later re-ordering is never clobbered on re-run,
 *   - unknown slugs are skipped with a notice (safe if a category was renamed/removed).
 *
 * Gaps of 10 leave room to insert a card between two others without renumbering.
 *
 * Run once per environment after the schema deploy:  npm run seed:service-order
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';

const UID = 'api::service.service';

/** slug -> display order (lower = earlier in the /services card strip). */
const ORDER: Record<string, number> = {
  'primary-research': 10,
  'qualitative-research': 20,
  'quantitative-research': 30,
  'business-research': 40,
  'research-support-functions': 50,
  'ai-driven-analytics-and-predictive-insights': 60,
  'comprehensive-cx-and-customer-journey-research': 70,
  'social-media-intelligence-and-sentiment-analysis': 80,
};

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  try {
    const changed: string[] = [];
    const missing: string[] = [];

    for (const [slug, order] of Object.entries(ORDER)) {
      // Operate on the draft (source of truth in draft&publish); republish only if a live version exists.
      const draft = await strapi.documents(UID).findFirst({ status: 'draft', filters: { slug }, fields: ['id', 'order'] });
      if (!draft) {
        missing.push(slug);
        continue;
      }
      if (draft.order === order) continue;

      const published = await strapi.documents(UID).findFirst({ status: 'published', filters: { slug }, fields: ['id'] });
      await strapi.documents(UID).update({ documentId: draft.documentId, data: { order } });
      if (published) await strapi.documents(UID).publish({ documentId: draft.documentId });
      changed.push(`${slug}=${order}`);
    }

    // eslint-disable-next-line no-console
    console.log(changed.length ? `[service-order] set: ${changed.join(', ')}` : '[service-order] all orders already current — unchanged');
    // eslint-disable-next-line no-console
    if (missing.length) console.log(`[service-order] slugs not found (skipped): ${missing.join(', ')}`);
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error('[service-order] failed:', err);
    process.exit(1);
  },
);
