import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::blog.blog', {
  config: {
    find: { policies: ['global::is-preview-allowed'] },
    findOne: { policies: ['global::is-preview-allowed'] },
  },
});

const customRoutes = [
  {
    method: 'GET',
    path: '/blogs/slugs',
    handler: 'blog.findSlugs',
    config: { policies: ['global::is-preview-allowed'] },
  },
  {
    method: 'GET',
    path: '/blogs/slug/:slug',
    handler: 'blog.findBySlug',
    config: { policies: ['global::is-preview-allowed'] },
  },
];

// See the equivalent comment in service/routes/service.ts: `defaultRouter.routes`
// is a getter that resolves the content type's schema on read, so it must
// stay lazy — never spread at module-eval time.
let routes: unknown[] | undefined;

export default {
  get routes() {
    if (!routes) {
      routes = [...customRoutes, ...(defaultRouter.routes as unknown as any[])];
    }
    return routes;
  },
};
