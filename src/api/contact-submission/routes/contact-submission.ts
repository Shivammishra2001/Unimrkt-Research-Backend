import { factories } from '@strapi/strapi';

/** Only `create` is exposed — a public lead-capture endpoint has no
 * business exposing find/findOne/update/delete on other people's
 * submissions. */
export default factories.createCoreRouter('api::contact-submission.contact-submission', {
  only: ['create'],
});
