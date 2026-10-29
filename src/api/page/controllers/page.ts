import { factories } from '@strapi/strapi';
import { buildPagePopulate } from '../services/page';

export default factories.createCoreController('api::page.page', ({ strapi }) => ({
  /**
   * GET /pages?filters[slug][$eq]=home — core list, but the deep populate
   * is forced server-side (Strapi v5 has no native `populate=deep`, and a
   * caller-supplied populate is never trusted). Filters, sort and
   * pagination from the query string still apply.
   */
  async find(ctx) {
    ctx.query = { ...ctx.query, populate: buildPagePopulate() as any };
    return super.find(ctx);
  },

  /**
   * GET /pages/slug/:slug — deep-populated, draft-aware single-entry
   * lookup by slug. Registered before the core router's routes (see
   * routes/page.ts) so it isn't swallowed by GET /pages/:id.
   */
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    if (!slug || typeof slug !== 'string') {
      return ctx.badRequest('Missing "slug" route param');
    }

    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const [entry] = await strapi.documents('api::page.page').findMany({
      filters: { slug },
      status,
      populate: buildPagePopulate(),
      limit: 1,
    });

    if (!entry) {
      return ctx.notFound('Page not found');
    }

    const sanitized = await strapi.contentAPI.sanitize.output(entry, strapi.getModel('api::page.page'), {
      auth: ctx.state.auth,
    });

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data: sanitized, meta: {} };
  },

  /**
   * GET /pages/slugs — slim `{ slug, updatedAt }` list, backs
   * generateStaticParams() on the frontend.
   */
  async findSlugs(ctx) {
    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const entries = await strapi.documents('api::page.page').findMany({
      status,
      fields: ['slug', 'updatedAt'],
      populate: {},
    });

    const sanitized = await strapi.contentAPI.sanitize.output(entries, strapi.getModel('api::page.page'), {
      auth: ctx.state.auth,
    });

    ctx.set('Cache-Control', isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600');

    return { data: sanitized, meta: {} };
  },
}));
