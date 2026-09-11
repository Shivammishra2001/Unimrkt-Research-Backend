import { factories } from '@strapi/strapi';

/**
 * No longer used by `api::service.service` itself (its `blocks`
 * dynamiczone was removed — see `buildServicePopulate()` below) or by
 * `api::industry.industry` (removed earlier the same way). Kept only
 * because `blocks.*` block components still exist and nothing else in
 * this codebase currently reads this map — safe to delete once nothing
 * needs the shape documented here.
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

/** Deep-populates every field Figma node 474:5731 actually uses — one
 * flat object, no dynamiczone (`blocks` was removed: same reasoning as
 * `api::industry.industry`'s populate builder — this content type has no
 * dynamic-zone concept, it's a fixed template). `features` is repurposed
 * for the Capabilities section (dark photo cards) — see the schema
 * comment on that field. */
export function buildServicePopulate() {
  return {
    thumbnail: true,
    seo: { populate: { shareImage: true } },
    features: { populate: { icon: true, link: true } },
    heroImage: true,
    heroActions: true,
    trustLogos: { populate: { image: true } },
    overviewImage: true,
    overviewFeatures: { populate: { image: true, icon: true } },
    credentials: true,
    methodologies: { populate: { image: true, icon: true } },
    industriesServed: { populate: { image: true, icon: true } },
    enquiryImage: true,
    faqItems: true,
    // Category hierarchy (Google Sheet IA migration) — parent is a single
    // shallow relation (no need to populate its own parent/children), and
    // children go one level deep only, matching the sheet's max depth.
    parent: { fields: ['title', 'slug'] as ['title', 'slug'] },
    children: { fields: ['title', 'slug', 'summary'] as ['title', 'slug', 'summary'] },
  };
}

export default factories.createCoreService('api::service.service');
