import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::services-page.services-page', {
  config: {
    find: { policies: ['global::is-preview-allowed'] },
  },
});
