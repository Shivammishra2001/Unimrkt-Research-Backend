/**
 * Notifies the frontend's on-demand ISR webhook. A single type has no
 * per-slug tag, so only the aggregate 'global' tag is fired.
 */
async function notifyRevalidate(tag: string) {
  const url = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    strapi.log.warn(`[revalidate] Skipping tag "${tag}" — FRONTEND_URL/REVALIDATE_SECRET not set`);
    return;
  }

  try {
    const res = await fetch(`${url}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ tag }),
    });
    if (!res.ok) {
      strapi.log.error(`[revalidate] Webhook responded ${res.status} for tag "${tag}"`);
    }
  } catch (err) {
    strapi.log.error(`[revalidate] Webhook request failed for tag "${tag}"`, err);
  }
}

export default {
  async afterCreate() {
    await notifyRevalidate('global');
  },

  async afterUpdate() {
    await notifyRevalidate('global');
  },
};
