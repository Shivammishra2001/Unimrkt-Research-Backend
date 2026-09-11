import { factories } from '@strapi/strapi';
import { buildServicesPagePopulate } from '../services/services-page';

/** Mirrors global's controller exactly (same singleType shape, same
 * "force populate, never trust the query string" + "no entry yet ->
 * plain empty response, not a 500" reasoning). */
export default factories.createCoreController('api::services-page.services-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = { ...ctx.query, populate: buildServicesPagePopulate() };
    const isDraft = ctx.query.status === 'draft';

    const result = await super.find(ctx);
    const { data, meta } = result ?? { data: null, meta: {} };

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data, meta };
  },
}));
