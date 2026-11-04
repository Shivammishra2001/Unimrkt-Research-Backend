import { notifyRevalidate } from '../../../../utils/revalidate';

/**
 * Same shape as blog's lifecycles. afterDelete covers a genuine delete and an unpublish. Without these, switching a case study's
 * "Page visibility" ON/OFF would only reach the website after the time-based cache window.
 */
export default {
  async afterCreate(event) {
    const { slug } = event.result;
    await notifyRevalidate(`case-study-${slug}`);
    await notifyRevalidate('case-studies');
  },

  async afterUpdate(event) {
    const { slug } = event.result;
    await notifyRevalidate(`case-study-${slug}`);
    await notifyRevalidate('case-studies');
    await notifyRevalidate('global');
  },

  async afterDelete(event) {
    const slug = event.result?.slug;
    if (slug) await notifyRevalidate(`case-study-${slug}`);
    await notifyRevalidate('case-studies');
    await notifyRevalidate('global');
  },
};
