import { notifyRevalidate } from '../../../../utils/revalidate';

/**
 * Was missing entirely until now — `industry` is a newer content type
 * (Google Sheet IA migration) that never got the same revalidation
 * lifecycle hook page/service/global already had, so industry content
 * changes never triggered on-demand ISR at all (only the hourly
 * REVALIDATE_SECONDS fallback).
 *
 * afterDelete covers both a genuine delete and an unpublish (Strapi's
 * Document Service `unpublish()` removes the published-status row, which
 * is a plain database-level delete under the hood — there is no separate
 * `afterUnpublish` lifecycle event to hook into instead).
 */
export default {
  async afterCreate(event) {
    const { slug } = event.result;
    await notifyRevalidate(`industry-${slug}`);
    await notifyRevalidate('industries');
  },

  async afterUpdate(event) {
    const { slug } = event.result;
    await notifyRevalidate(`industry-${slug}`);
    await notifyRevalidate('industries');
  },

  async afterDelete(event) {
    const slug = event.result?.slug;
    if (slug) await notifyRevalidate(`industry-${slug}`);
    await notifyRevalidate('industries');
  },
};
