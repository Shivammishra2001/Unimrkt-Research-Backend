import { factories } from '@strapi/strapi';
import { buildOurCompanyPagePopulate } from '../services/our-company-page';

/** GET /our-company-page — singleType, forces its own deep populate (same
 * convention as services-page/getServicesPageSettings — no query sent by
 * the frontend, backend fills it in). */
export default factories.createCoreController('api::our-company-page.our-company-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildOurCompanyPagePopulate(),
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
