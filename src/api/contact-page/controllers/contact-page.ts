import { factories } from '@strapi/strapi';
import { buildContactPagePopulate } from '../services/contact-page';

/** GET /contact-page — singleType, forces its own deep populate (same
 * convention as services-page/our-company-page — no query sent by the
 * frontend, backend fills it in). */
export default factories.createCoreController('api::contact-page.contact-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildContactPagePopulate(),
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
