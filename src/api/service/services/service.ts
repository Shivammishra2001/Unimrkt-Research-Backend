import { factories } from '@strapi/strapi';

/**
 * Exported so `city-service-override`'s `overrideBlocks` dynamic zone —
 * the same 5-component list, deliberately — populates identically to
 * `service.blocks`, since an override's blocks fully replace a master's.
 */
export const BLOCK_POPULATE = {
  'blocks.hero': { populate: { media: true, actions: true, sideMenu: true } },
  'blocks.content': { populate: { media: true } },
  'blocks.feature-grid': { populate: { items: { populate: { icon: true, link: true } } } },
  'blocks.testimonials': {
    populate: { testimonials: { populate: { avatar: true, companyLogo: true } } },
  },
  'blocks.cta': { populate: { actions: true, background: true } },
};

export function buildServiceListPopulate() {
  return { thumbnail: true };
}

export function buildServicePopulate() {
  return {
    thumbnail: true,
    seo: { populate: ['shareImage'] },
    features: { populate: { icon: true, link: true } },
    blocks: { on: BLOCK_POPULATE },
  };
}

export default factories.createCoreService('api::service.service');
