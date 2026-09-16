import { factories } from '@strapi/strapi';
import { buildCaseStudyPopulate } from '../services/case-study';

/** `find` forces the same deep populate every list/detail caller needs
 * (matches industry/service's own convention) — a caller-supplied
 * `populate` query has no effect either way. */
export default factories.createCoreController('api::case-study.case-study', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = { ...ctx.query, populate: buildCaseStudyPopulate() };
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  /** GET /case-studies/slug/:slug — deep-populated single-entry lookup
   * by slug, backing /case-study/[slug]. Structurally identical to
   * blog.findBySlug / service.findBySlug. */
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    if (!slug || typeof slug !== 'string') {
      return ctx.badRequest('Missing "slug" route param');
    }

    const [entry] = await strapi.documents('api::case-study.case-study').findMany({
      filters: { slug },
      status: 'published',
      populate: buildCaseStudyPopulate(),
      limit: 1,
    });

    if (!entry) {
      return ctx.notFound('Case study not found');
    }

    const sanitized = await strapi.contentAPI.sanitize.output(entry, strapi.getModel('api::case-study.case-study'), {
      auth: ctx.state.auth,
    });

    return { data: sanitized, meta: {} };
  },

  /** GET /case-studies/slugs — slim `{ slug, updatedAt }` list, backs
   * generateStaticParams() on the frontend. */
  async findSlugs(ctx) {
    const entries = await strapi.documents('api::case-study.case-study').findMany({
      status: 'published',
      fields: ['slug', 'updatedAt'],
      populate: {},
    });

    const sanitized = await strapi.contentAPI.sanitize.output(entries, strapi.getModel('api::case-study.case-study'), {
      auth: ctx.state.auth,
    });

    return { data: sanitized, meta: {} };
  },
}));
