import { factories } from '@strapi/strapi';
import { buildPrivacyPolicyPagePopulate } from '../services/privacy-policy-page';

/** GET /privacy-policy-page — singleType, forces its own deep populate
 * (same convention as contact-page/our-company-page/case-study-page — no
 * query sent by the frontend, backend fills it in). */
export default factories.createCoreController('api::privacy-policy-page.privacy-policy-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildPrivacyPolicyPagePopulate(),
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
