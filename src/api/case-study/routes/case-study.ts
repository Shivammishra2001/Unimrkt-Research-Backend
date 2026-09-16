import { factories } from '@strapi/strapi';

/** Read-only public routes — `find`/`findOne` only, plus the two
 * slug-based custom routes every other detail page in this project
 * uses (findBySlug/findSlugs). No create/update/delete registered at
 * all. */
const defaultRouter = factories.createCoreRouter('api::case-study.case-study', {
  only: ['find', 'findOne'],
});

const customRoutes = [
  {
    method: 'GET',
    path: '/case-studies/slugs',
    handler: 'case-study.findSlugs',
  },
  {
    method: 'GET',
    path: '/case-studies/slug/:slug',
    handler: 'case-study.findBySlug',
  },
];

// `defaultRouter.routes` is a getter that resolves the content type's
// schema on read (same reasoning as blog/routes/service.ts), so it
// must stay lazy — never spread at module-eval time.
let routes: unknown[] | undefined;

export default {
  get routes() {
    if (!routes) {
      routes = [...customRoutes, ...(defaultRouter.routes as unknown as any[])];
    }
    return routes;
  },
};
