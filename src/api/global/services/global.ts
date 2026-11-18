import { factories } from '@strapi/strapi';

/**
 * A component nested inside another component always needs its own
 * explicit populate branch — `true` alone only populates the parent
 * component's own scalar fields, not `primaryNav[].children` or
 * `footerColumns[].links`.
 */
export function buildGlobalPopulate() {
  return {
    logo: true,
    logoDark: true,
    primaryNav: { populate: { children: true, page: { fields: ['title', 'slug', 'isActive'] } } },
    navCta: true,
    // Mega-menu settings: relations return just what the menus need (sub-services / industry lists come live from
    // their own endpoints, so a newly published Service or Industry appears without touching Global).
    servicesMenu: {
      populate: {
        categories: { populate: { service: { fields: ['title', 'slug'] } } },
        exploreLink: true,
        ctaLink: true,
      },
    },
    industriesMenu: {
      populate: {
        groups: { populate: { industries: { fields: ['title', 'slug'] } } },
        viewAllLink: true,
        ctaLink: true,
      },
    },
    footerBadges: true,
    footerColumns: { populate: { links: true } },
    socialLinks: true,
    chatWidget: { populate: { quickActions: true, keywordReplies: true } },
    defaultSeo: { populate: ['shareImage'] },
    // Shared closing bands (Global defaults; pages may override).
    blogBand: true,
    faqBand: { populate: { cta: true } },
    finalCta: { populate: { action: true } },
  };
}

export default factories.createCoreService('api::global.global');
