/**
 * Registered as `global::is-preview-allowed`. Attached (as a route-level
 * `config.policies` entry, never a global middleware) to every read route
 * that can surface draft content: `global.find`, `page.findSlugs`,
 * `page.findBySlug`, `service.find`, `service.findOne`,
 * `service.findSlugs`, `service.findBySlug`, `city-service.findByLocation`,
 * `city-service.findCombinations`.
 *
 * Only ever blocks DRAFT access — a request that isn't asking for draft
 * content always passes. When draft content is requested, the caller
 * must be authenticated with a Strapi API token whose `type` is exactly
 * `full-access` (a read-only or custom-scoped token is rejected the same
 * as an unauthenticated request).
 */
export default (ctx, config, { strapi }) => {
  // `ctx` here is Strapi's policy-context wrapper, built via
  // `Object.assign({}, koaCtx)` — a SHALLOW, OWN-PROPERTY-ONLY copy. Koa
  // exposes `query` as a getter delegated onto `ctx.request` (not an own
  // property of `ctx` itself), so `ctx.query` is always `undefined` here
  // even though it works everywhere else in the app. `ctx.request` (and
  // therefore `ctx.request.query`) IS copied, since it's a real own
  // property. Same trap applies to any other delegated Koa getter
  // (`ctx.body`, `ctx.method`, …) accessed from inside a policy.
  const query = ctx.request.query;
  const wantsDraft = query.status === 'draft' || query.publicationState === 'preview';

  if (!wantsDraft) return true;

  const auth = ctx.state.auth;
  const isFullAccessToken =
    auth?.strategy?.name === 'api-token' && auth?.credentials?.type === 'full-access';

  if (isFullAccessToken) return true;

  strapi.log.warn('[is-preview-allowed] Rejected draft request without a full-access token');
  return false;
};
