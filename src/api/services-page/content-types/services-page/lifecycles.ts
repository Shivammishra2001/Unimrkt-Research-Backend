import { notifyRevalidate } from '../../../../utils/revalidate';

/** A single type has no per-slug tag, so only the aggregate 'services-page'
 * tag is ever fired — mirrors global's lifecycle exactly. afterDelete
 * covers both a genuine delete and an unpublish (Strapi's Document
 * Service `unpublish()` removes the published-status row, a plain
 * database-level delete under the hood — no separate `afterUnpublish`
 * event exists to hook into instead). */
export default {
  async afterCreate() {
    await notifyRevalidate('services-page');
  },

  async afterUpdate() {
    await notifyRevalidate('services-page');
  },

  async afterDelete() {
    await notifyRevalidate('services-page');
  },
};
