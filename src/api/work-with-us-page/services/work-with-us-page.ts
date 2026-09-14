import { factories } from '@strapi/strapi';

export function buildWorkWithUsPagePopulate() {
  return {
    heroImage: true,
    heroCta: true,
    valuesCards: { populate: { image: true, icon: true } },
    benefitsImage: true,
    benefits: { populate: { image: true, icon: true } },
    jobs: true,
    journeySteps: { populate: { image: true, icon: true } },
    faqItems: true,
    seo: { populate: { shareImage: true } },
  };
}

export default factories.createCoreService('api::work-with-us-page.work-with-us-page');
