/**
 * Notifies the frontend's on-demand ISR webhook. Unlike the other five
 * lifecycles, this one must re-read the entry: `event.result` does not
 * carry the `city`/`service` relations needed to build the tag, so a
 * fresh `findOne` with an explicit populate is required first.
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

async function notify(documentId: string) {
  const entry = await strapi
    .documents('api::city-service-override.city-service-override')
    .findOne({
      documentId,
      populate: { city: true, service: true },
    });

  const citySlug = entry?.city?.slug;
  const serviceSlug = entry?.service?.slug;

  if (!citySlug || !serviceSlug) {
    strapi.log.warn('[city-service-override] Skipping revalidate — city/service relation not resolved');
    return;
  }

  await notifyRevalidate(`city-service-${citySlug}-${serviceSlug}`);
  await notifyRevalidate('city-service-combinations');
}

export default {
  async afterCreate(event) {
    await notify(event.result.documentId);
  },

  async afterUpdate(event) {
    await notify(event.result.documentId);
  },
};
