import { factories } from '@strapi/strapi';
import { buildGlobalPopulate } from '../services/global';

export default factories.createCoreController('api::global.global', ({ strapi }) => ({
  /**
   * Overridden so an earlier version's bug — reading `populate` from
   * the query string — can't recur: this forces `buildGlobalPopulate()`
   * unconditionally, overwriting any caller-supplied populate.
   */
  async find(ctx) {
    ctx.query = { ...ctx.query, populate: buildGlobalPopulate() };
    const isDraft = ctx.query.status === 'draft';

    // super.find() returns bare `null` (not `{ data: null, meta: {} }`) when
    // the Global singleType has no entry yet — an unseeded DB, most likely.
    // Destructuring that directly throws; guard it so this returns a normal
    // empty response instead of a 500.
    const result = await super.find(ctx);
    const { data, meta } = result ?? { data: null, meta: {} };

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data, meta };
  },
}));
