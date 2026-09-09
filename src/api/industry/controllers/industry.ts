import { factories } from '@strapi/strapi';
import { buildIndustryListPopulate, buildIndustryPopulate } from '../services/industry';

/** Structurally identical to service's controller — see the equivalent
 * comments there for why each action shape looks the way it does. */
export default factories.createCoreController('api::industry.industry', ({ strapi }) => ({
  /** GET /industries — forces the icon-only list populate and a default
   * title:asc sort (only when the caller didn't specify one). */
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildIndustryListPopulate(),
      sort: ctx.query.sort ?? 'title:asc',
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  /** GET /industries/slug/:slug — deep-populated, draft-aware single-entry
   * lookup by slug. */
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    if (!slug || typeof slug !== 'string') {
      return ctx.badRequest('Missing "slug" route param');
    }

    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const [entry] = await strapi.documents('api::industry.industry').findMany({
      filters: { slug },
      status,
      populate: buildIndustryPopulate(),
      limit: 1,
    });

    if (!entry) {
      return ctx.notFound('Industry not found');
    }

    const sanitized = await strapi.contentAPI.sanitize.output(
      entry,
      strapi.getModel('api::industry.industry'),
      { auth: ctx.state.auth }
    );

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data: sanitized, meta: {} };
  },

  /** GET /industries/slugs — slim `{ slug, updatedAt }` list, backs
   * generateStaticParams() on the frontend. */
  async findSlugs(ctx) {
    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const entries = await strapi.documents('api::industry.industry').findMany({
      status,
      fields: ['slug', 'updatedAt'],
      populate: {},
    });

    const sanitized = await strapi.contentAPI.sanitize.output(
      entries,
      strapi.getModel('api::industry.industry'),
      { auth: ctx.state.auth }
    );

    ctx.set('Cache-Control', isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600');

    return { data: sanitized, meta: {} };
  },
}));
