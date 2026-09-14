import { factories } from '@strapi/strapi';
import { buildWorkWithUsPagePopulate } from '../services/work-with-us-page';

export default factories.createCoreController('api::work-with-us-page.work-with-us-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildWorkWithUsPagePopulate(),
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
