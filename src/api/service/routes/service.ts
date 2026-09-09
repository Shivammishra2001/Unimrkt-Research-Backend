import { factories } from '@strapi/strapi';

/**
 * Unlike `page`, the core router's find AND findOne both get
 * is-preview-allowed attached — so ?status=draft is rejected on the
 * listing/detail routes too, not just the custom slug routes.
 */
const defaultRouter = factories.createCoreRouter('api::service.service', {
  config: {
    find: { policies: ['global::is-preview-allowed'] },
    findOne: { policies: ['global::is-preview-allowed'] },
  },
});

const customRoutes = [
  {
    method: 'GET',
    path: '/services/tree',
    handler: 'service.findTree',
    config: { policies: ['global::is-preview-allowed'] },
  },
  {
    method: 'GET',
    path: '/services/slugs',
    handler: 'service.findSlugs',
    config: { policies: ['global::is-preview-allowed'] },
  },
  {
    method: 'GET',
    path: '/services/slug/:slug',
    handler: 'service.findBySlug',
    config: { policies: ['global::is-preview-allowed'] },
  },
];

// See the equivalent comment in page/routes/page.ts: `defaultRouter.routes`
// is a getter that resolves the content type's schema on read, so it
// must stay lazy — never spread at module-eval time.
let routes: unknown[] | undefined;

export default {
  get routes() {
    if (!routes) {
      // See the equivalent comment in page/routes/page.ts.
      routes = [...customRoutes, ...(defaultRouter.routes as unknown as any[])];
    }
    return routes;
  },
};
