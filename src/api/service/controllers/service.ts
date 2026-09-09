import { factories } from '@strapi/strapi';
import { buildServiceListPopulate, buildServicePopulate } from '../services/service';

export default factories.createCoreController('api::service.service', ({ strapi }) => ({
  /**
   * GET /services — forces the thumbnail-only list populate and a
   * default title:asc sort (only when the caller didn't specify one)
   * before delegating to the core find action.
   */
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildServiceListPopulate(),
      sort: ctx.query.sort ?? 'title:asc',
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  /**
   * GET /services/slug/:slug — deep-populated, draft-aware single-entry
   * lookup by slug. Structurally identical to page.findBySlug.
   */
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    if (!slug || typeof slug !== 'string') {
      return ctx.badRequest('Missing "slug" route param');
    }

    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const [entry] = await strapi.documents('api::service.service').findMany({
      filters: { slug },
      status,
      populate: buildServicePopulate(),
      limit: 1,
    });

    if (!entry) {
      return ctx.notFound('Service not found');
    }

    const sanitized = await strapi.contentAPI.sanitize.output(
      entry,
      strapi.getModel('api::service.service'),
      { auth: ctx.state.auth }
    );

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data: sanitized, meta: {} };
  },

  /**
   * GET /services/tree — top-level (parent: null) service categories with
   * one level of children populated. Separate from `find` deliberately:
   * `find` always forces the thumbnail-only list populate for the plain
   * /services archive, so the nav/category-tree shape needs its own route
   * rather than overloading that contract with a query flag.
   */
  async findTree(ctx) {
    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const entries = await strapi.documents('api::service.service').findMany({
      filters: { parent: { id: { $null: true } } },
      status,
      sort: 'title:asc',
      populate: { children: { fields: ['title', 'slug', 'summary'], sort: 'title:asc' } },
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      entries,
      strapi.getModel('api::service.service'),
      { auth: ctx.state.auth }
    );

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data: sanitized, meta: {} };
  },

  /**
   * GET /services/slugs — slim `{ slug, updatedAt }` list, backs
   * generateStaticParams() on the frontend.
   */
  async findSlugs(ctx) {
    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const entries = await strapi.documents('api::service.service').findMany({
      status,
      fields: ['slug', 'updatedAt'],
      populate: {},
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      entries,
      strapi.getModel('api::service.service'),
      { auth: ctx.state.auth }
    );

    ctx.set('Cache-Control', isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600');

    return { data: sanitized, meta: {} };
  },
}));
