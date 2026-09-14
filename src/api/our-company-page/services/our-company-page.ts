import { factories } from '@strapi/strapi';

export function buildOurCompanyPagePopulate() {
  return {
    heroImage: true,
    heroCta: true,
    stats: true,
    aboutImage: true,
    insightsCards: { populate: { image: true, icon: true } },
    ecosystemCards: { populate: { image: true, icon: true } },
    valuesCards: { populate: { image: true, icon: true } },
    industriesCards: { populate: { image: true, icon: true } },
    faqItems: true,
    seo: { populate: { shareImage: true } },
  };
}

export default factories.createCoreService('api::our-company-page.our-company-page');
