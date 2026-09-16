import { factories } from '@strapi/strapi';
import { buildCaseStudyPagePopulate } from '../services/case-study-page';

/** GET /case-study-page — singleType, forces its own deep populate (same
 * convention as contact-page/our-company-page/work-with-us-page — no
 * query sent by the frontend, backend fills it in). */
export default factories.createCoreController('api::case-study-page.case-study-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildCaseStudyPagePopulate(),
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
