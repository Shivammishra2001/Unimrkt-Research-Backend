import { notifyRevalidate } from '../../../../utils/revalidate';

/**
 * A single type has no per-slug tag, so only the aggregate 'global' tag is
 * ever fired. afterDelete covers both a genuine delete and an unpublish
 * (Strapi's Document Service `unpublish()` removes the published-status
 * row, which is a plain database-level delete under the hood — there is
 * no separate `afterUnpublish` lifecycle event to hook into instead).
 */
export default {
  async afterCreate() {
    await notifyRevalidate('global');
  },

  async afterUpdate() {
    await notifyRevalidate('global');
  },

  async afterDelete() {
    await notifyRevalidate('global');
  },
};
