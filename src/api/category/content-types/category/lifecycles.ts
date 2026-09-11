import { notifyRevalidate } from '../../../../utils/revalidate';

/**
 * Mirrors gallery-item's lifecycle exactly: a single tag ("categories") —
 * the /blogs filter tab list always fetches the whole collection in one
 * request, so one shared tag is all the frontend needs. Without this, a
 * category created/edited/deleted from the Admin panel would only reach
 * the live site after REVALIDATE_SECONDS' natural cache expiry instead
 * of immediately — the same gap every other CMS-backed list on this site
 * (blog, gallery-item, global, page, service, industry) already closes
 * the same way.
 *
 * afterDelete covers both a genuine delete and an unpublish (Strapi's
 * Document Service `unpublish()` removes the published-status row, which
 * is a plain database-level delete under the hood — there is no separate
 * `afterUnpublish` lifecycle event to hook into instead).
 */
export default {
  async afterCreate() {
    await notifyRevalidate('categories');
  },

  async afterUpdate() {
    await notifyRevalidate('categories');
  },

  async afterDelete() {
    await notifyRevalidate('categories');
  },
};
