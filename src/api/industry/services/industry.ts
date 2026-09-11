import { factories } from '@strapi/strapi';

export function buildIndustryListPopulate() {
  return { icon: true };
}

/** Deep-populates every field node 384:6205 actually uses — one flat
 * object, no dynamiczone (`blocks` was removed: this content type has no
 * dynamic-zone concept, it's a fixed template). */
export function buildIndustryPopulate() {
  return {
    icon: true,
    seo: { populate: { shareImage: true } },
    heroImage: true,
    heroActions: true,
    trustLogos: { populate: { image: true } },
    whatWeDoCta: true,
    whatWeDoImage: true,
    whyResearchCards: { populate: { image: true, icon: true } },
    expertiseItems: { populate: { image: true, icon: true } },
    challengesCards: { populate: { image: true, icon: true } },
    whoWeServeCards: { populate: { image: true, icon: true } },
    methodologies: { populate: { image: true } },
    empowerCta: true,
    empowerImage: true,
    enquiryImage: true,
    faqItems: true,
    caseStudiesCta: true,
    caseStudies: { populate: { image: true } },
  };
}

export default factories.createCoreService('api::industry.industry');
