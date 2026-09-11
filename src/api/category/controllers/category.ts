import { factories } from '@strapi/strapi';

/** GET /categories — default sort `name:asc` (only when the caller
 * didn't specify one) so the blog filter tabs render in a stable,
 * predictable order regardless of creation order in the admin. */
export default factories.createCoreController('api::category.category', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      sort: ctx.query.sort ?? 'name:asc',
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
