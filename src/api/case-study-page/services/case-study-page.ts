import { factories } from '@strapi/strapi';

export function buildCaseStudyPagePopulate() {
  return {
    heroImage: true,
    heroCta: true,
    approachSteps: { populate: { image: true, icon: true } },
    testimonials: true,
    listingFaqItems: true,
    bottomCtaAction: true,
  };
}

export default factories.createCoreService('api::case-study-page.case-study-page');
