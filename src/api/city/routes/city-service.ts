/**
 * A second routes file in the same `city` API — Strapi merges every
 * file under one API's routes/ directory into the same router table.
 * Unrelated to the /api/cities core CRUD paths, so there is no
 * :id-vs-custom-path ordering concern here.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/services-by-location',
      handler: 'city-service.findByLocation',
      config: { policies: ['global::is-preview-allowed'] },
    },
    {
      method: 'GET',
      path: '/services-by-location/combinations',
      handler: 'city-service.findCombinations',
      config: { policies: ['global::is-preview-allowed'] },
    },
  ],
};
