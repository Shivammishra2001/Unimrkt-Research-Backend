/**
 * Shared by every content-type's lifecycles.ts (global, page, service,
 * industry) — was previously copy-pasted verbatim into each one.
 *
 * Notifies the frontend's on-demand ISR webhook so a created/updated/
 * published/unpublished/deleted entry revalidates near-instantly instead
 * of waiting out the frontend's own time-based fallback window
 * (REVALIDATE_SECONDS).
 *
 * A webhook failure (network error or non-2xx) is caught and logged,
 * never rethrown — a revalidation outage must never roll back the
 * content save that triggered it.
 */
export async function notifyRevalidate(tag: string) {
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
