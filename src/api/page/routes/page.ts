import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::page.page');

/**
 * Prepended before the core router's routes: the core router registers
 * GET /pages/:id, and a single-segment custom path like /pages/slugs
 * would otherwise be swallowed by :id first (Koa/path-to-regexp matches
 * route order, not specificity).
 */
const customRoutes = [
  {
    method: 'GET',
    path: '/pages/slugs',
    handler: 'page.findSlugs',
    config: { policies: ['global::is-preview-allowed'] },
  },
  {
    method: 'GET',
    path: '/pages/slug/:slug',
    handler: 'page.findBySlug',
    config: { policies: ['global::is-preview-allowed'] },
  },
];

// `defaultRouter.routes` is itself a getter that resolves the content
// type's schema (via `createRoutes`) the moment it's read — reading it
// eagerly here, at module-eval time, runs before Strapi has finished
// registering content types and throws `Cannot read properties of
// undefined (reading 'kind')`. Wrap the merge in a lazy getter so
// `.routes` is only resolved when Strapi itself asks for it (after
// content-type loading completes), and cache the result since Strapi
// may read `.routes` more than once.
let routes: unknown[] | undefined;

export default {
  get routes() {
    if (!routes) {
      // Strapi's own type declares `.routes` as `Route[] | (() => Route[])`
      // even though the runtime value here is always an array (a getter
      // Strapi itself defines) — cast past the union so the spread below
      // type-checks.
      routes = [...customRoutes, ...(defaultRouter.routes as unknown as any[])];
    }
    return routes;
  },
};
