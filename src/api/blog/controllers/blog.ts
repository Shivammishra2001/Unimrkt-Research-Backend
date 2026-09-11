import { factories } from '@strapi/strapi';
import { buildBlogPopulate } from '../services/blog';

/**
 * Unlike service/industry/gallery-item, `find` does NOT force its own
 * populate here — the frontend's controllers/blog.ts is specified to call
 * this endpoint as a plain `GET /api/blogs?populate=*`, so a caller-supplied
 * populate must actually take effect. Only a default sort is applied (and
 * only when the caller didn't already specify one): `order:asc` (0 = most
 * recent), the same explicit-integer ordering `gallery-item` uses, rather
 * than sorting on `publishedAt` — this content type's seed data stages
 * every post through Strapi's Document Service publish() in one pass, so
 * `publishedAt` timestamps land in upload order, not editorial order; an
 * explicit field is the only way to control "latest first" precisely.
 */
export default factories.createCoreController('api::blog.blog', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      sort: ctx.query.sort ?? 'order:asc',
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  /**
   * GET /blogs/slug/:slug — deep-populated, draft-aware single-entry
   * lookup by slug. Structurally identical to service.findBySlug.
   */
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    if (!slug || typeof slug !== 'string') {
      return ctx.badRequest('Missing "slug" route param');
    }

    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const [entry] = await strapi.documents('api::blog.blog').findMany({
      filters: { slug },
      status,
      populate: buildBlogPopulate(),
      limit: 1,
    });

    if (!entry) {
      return ctx.notFound('Blog post not found');
    }

    const sanitized = await strapi.contentAPI.sanitize.output(
      entry,
      strapi.getModel('api::blog.blog'),
      { auth: ctx.state.auth }
    );

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data: sanitized, meta: {} };
  },

  /**
   * GET /blogs/slugs — slim `{ slug, updatedAt }` list, backs
   * generateStaticParams() on the frontend.
   */
  async findSlugs(ctx) {
    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const entries = await strapi.documents('api::blog.blog').findMany({
      status,
      fields: ['slug', 'updatedAt'],
      populate: {},
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      entries,
      strapi.getModel('api::blog.blog'),
      { auth: ctx.state.auth }
    );

    ctx.set('Cache-Control', isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600');

    return { data: sanitized, meta: {} };
  },
}));
