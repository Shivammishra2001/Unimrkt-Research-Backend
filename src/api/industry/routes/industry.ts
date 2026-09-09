import { factories } from '@strapi/strapi';

/** Structurally identical to service/routes/service.ts — see the
 * equivalent comment there. */
const defaultRouter = factories.createCoreRouter('api::industry.industry', {
  config: {
    find: { policies: ['global::is-preview-allowed'] },
    findOne: { policies: ['global::is-preview-allowed'] },
  },
});

const customRoutes = [
  {
    method: 'GET',
    path: '/industries/slugs',
    handler: 'industry.findSlugs',
    config: { policies: ['global::is-preview-allowed'] },
  },
  {
    method: 'GET',
    path: '/industries/slug/:slug',
    handler: 'industry.findBySlug',
    config: { policies: ['global::is-preview-allowed'] },
  },
];

let routes: unknown[] | undefined;

export default {
  get routes() {
    if (!routes) {
      routes = [...customRoutes, ...(defaultRouter.routes as unknown as any[])];
    }
    return routes;
  },
};
