import { factories } from '@strapi/strapi';

/** Read-only public listing — `find`/`findOne` only, matching Step 2's
 * spec exactly. No create/update/delete route is registered at all. */
export default factories.createCoreRouter('api::case-study.case-study', {
  only: ['find', 'findOne'],
});
