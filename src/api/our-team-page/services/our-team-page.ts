import { factories } from '@strapi/strapi';

export function buildOurTeamPagePopulate() {
  return {
    heroImage: true,
    bottomCtaAction: true,
    seo: { populate: { shareImage: true } },
  };
}

export default factories.createCoreService('api::our-team-page.our-team-page');
