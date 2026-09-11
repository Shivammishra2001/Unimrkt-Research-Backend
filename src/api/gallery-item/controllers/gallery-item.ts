import { factories } from '@strapi/strapi';
import { buildGalleryItemPopulate } from '../services/gallery-item';

/** GET /gallery-items — forces the image populate and a default
 * order:asc,createdAt:desc sort (only when the caller didn't specify
 * one), same shape as industry/service's list `find` override. */
export default factories.createCoreController('api::gallery-item.gallery-item', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildGalleryItemPopulate(),
      sort: ctx.query.sort ?? ['order:asc', 'createdAt:desc'],
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
