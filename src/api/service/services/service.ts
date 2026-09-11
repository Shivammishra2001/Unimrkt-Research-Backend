import { factories } from '@strapi/strapi';

/**
 * Exported so `industry`'s populate builder (src/api/industry/services/
 * industry.ts) reuses the exact same component-populate map — both
 * content types share the same dynamic-zone component list.
 *
 * `blocks.stats-band` was added here (matching page.ts's separate,
 * longer-standing populate map) once the Google Sheet content-enrichment
 * pass started actually using stats-band blocks on service/industry
 * entries — before that, neither content type used the component, so its
 * absence here was never noticed: a dynamic zone's `on`-keyed populate
 * silently drops any component type not listed, not just its nested
 * fields.
 */
export const BLOCK_POPULATE = {
  'blocks.hero': { populate: { media: true, actions: true, sideMenu: true } },
  'blocks.content': { populate: { media: true } },
  'blocks.feature-grid': { populate: { items: { populate: { icon: true, link: true } } } },
  'blocks.testimonials': {
    populate: { testimonials: { populate: { avatar: true, companyLogo: true } } },
  },
  'blocks.cta': { populate: { actions: true, background: true } },
  'blocks.stats-band': { populate: { items: true } },
  // items reuse blocks.feature-item (icon + link populated the same way
  // blocks.feature-grid's items already are above).
  'blocks.why-choose-us': { populate: { items: { populate: { icon: true, link: true } } } },
  'blocks.process-steps': { populate: { steps: { populate: { icon: true } } } },
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
    // Category hierarchy (Google Sheet IA migration) — parent is a single
    // shallow relation (no need to populate its own parent/children), and
    // children go one level deep only, matching the sheet's max depth.
    parent: { fields: ['title', 'slug'] },
    children: { fields: ['title', 'slug', 'summary'] },
  };
}

export default factories.createCoreService('api::service.service');
