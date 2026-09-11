import { factories } from '@strapi/strapi';

export function buildGalleryItemPopulate() {
  return { image: true };
}

export default factories.createCoreService('api::gallery-item.gallery-item');
