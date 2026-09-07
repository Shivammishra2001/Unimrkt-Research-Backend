import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::global.global', {
  config: {
    find: { policies: ['global::is-preview-allowed'] },
  },
});
