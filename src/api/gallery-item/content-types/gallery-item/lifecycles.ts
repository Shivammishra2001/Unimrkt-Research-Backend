import { notifyRevalidate } from '../../../../utils/revalidate';

/**
 * A single tag ("gallery-items") — unlike page/service/industry there's
 * no per-entry slug to key a second tag off of; /gallery always renders
 * the whole collection in one request, so one shared tag is all the
 * frontend's fetch needs.
 *
 * afterDelete covers both a genuine delete and an unpublish (Strapi's
 * Document Service `unpublish()` removes the published-status row, which
 * is a plain database-level delete under the hood — there is no separate
 * `afterUnpublish` lifecycle event to hook into instead).
 */
export default {
  async afterCreate() {
    await notifyRevalidate('gallery-items');
  },

  async afterUpdate() {
    await notifyRevalidate('gallery-items');
  },

  async afterDelete() {
    await notifyRevalidate('gallery-items');
  },
};
