import { factories } from '@strapi/strapi';
import { buildOurTeamPagePopulate } from '../services/our-team-page';

/** GET /our-team-page — singleType, forces its own deep populate (same
 * convention as case-study-page/privacy-policy-page — no query sent by
 * the frontend, backend fills it in). */
export default factories.createCoreController('api::our-team-page.our-team-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildOurTeamPagePopulate(),
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
