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
    await notifyRevalidate(`page-${slug}`);
    await notifyRevalidate('pages');
  },

  async afterUpdate(event) {
    const { slug } = event.result;
    await notifyRevalidate(`page-${slug}`);
    await notifyRevalidate('pages');
  },

  async afterDelete(event) {
    const slug = event.result?.slug;
    if (slug) await notifyRevalidate(`page-${slug}`);
    await notifyRevalidate('pages');
  },
};
