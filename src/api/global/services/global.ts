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
    primaryNav: { populate: { children: true } },
    navCta: true,
    footerColumns: { populate: { links: true } },
    socialLinks: true,
    defaultSeo: { populate: ['shareImage'] },
  };
}

export default factories.createCoreService('api::global.global');
