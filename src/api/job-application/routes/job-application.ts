import { factories } from '@strapi/strapi';

/** Only `create` is exposed — a public application-capture endpoint has no
 * business exposing find/findOne/update/delete on other applicants' data. */
export default factories.createCoreRouter('api::job-application.job-application', {
  only: ['create'],
});
