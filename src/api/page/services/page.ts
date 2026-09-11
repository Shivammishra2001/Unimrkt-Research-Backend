import { factories } from '@strapi/strapi';

/**
 * The single source of truth for `page`'s deep-populate shape — one
 * branch per dynamic-zone component. Never trust a caller-supplied
 * `populate` query string; the controller always forces this instead.
 */
export function buildPagePopulate() {
  return {
    seo: { populate: ['shareImage'] },
    blocks: {
      on: {
        'blocks.hero': { populate: { media: true, actions: true, sideMenu: true } },
        'blocks.content': { populate: { media: true } },
        'blocks.feature-grid': { populate: { items: { populate: { icon: true, link: true } } } },
        'blocks.testimonials': {
          populate: { testimonials: { populate: { avatar: true, companyLogo: true } } },
        },
        'blocks.cta': { populate: { actions: true, background: true } },
        'blocks.stats-band': { populate: { items: true } },
        'blocks.service-band': { populate: { background: true, cta: true, items: true } },
        'blocks.industry-grid': {
          populate: { background: true, cta: true, items: { populate: { image: true } } },
        },
        'blocks.media-gallery': {
          populate: { actions: true, items: { populate: { media: true } } },
        },
        'blocks.faq': { populate: { background: true, items: true, cta: true } },
        'blocks.blog-teaser': {
          populate: { actions: true, posts: { populate: { image: true } } },
        },
        // items reuse blocks.feature-item (same icon+link populate as
        // blocks.feature-grid's items above).
        'blocks.why-choose-us': { populate: { items: { populate: { icon: true, link: true } } } },
        'blocks.process-steps': { populate: { steps: { populate: { icon: true } } } },
      },
    },
  };
}

export default factories.createCoreService('api::page.page');
