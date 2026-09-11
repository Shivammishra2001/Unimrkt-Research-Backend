import { notifyRevalidate } from '../../../../utils/revalidate';

/**
 * afterDelete covers both a genuine delete and an unpublish (Strapi's
 * Document Service `unpublish()` removes the published-status row, which
 * is a plain database-level delete under the hood — there is no separate
 * `afterUnpublish` lifecycle event to hook into instead).
 */
export default {
  async afterCreate(event) {
    const { slug } = event.result;
    await notifyRevalidate(`service-${slug}`);
    await notifyRevalidate('services');
  },

  async afterUpdate(event) {
    const { slug } = event.result;
    await notifyRevalidate(`service-${slug}`);
    await notifyRevalidate('services');
  },

  async afterDelete(event) {
    const slug = event.result?.slug;
    if (slug) await notifyRevalidate(`service-${slug}`);
    await notifyRevalidate('services');
  },
};
