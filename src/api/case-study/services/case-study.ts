import { factories } from '@strapi/strapi';

/** Deep-populate for both the listing grid (coverImage) and the detail
 * page (Figma node 1107:49842) — every media/component field the
 * schema defines. */
export function buildCaseStudyPopulate() {
  return {
    coverImage: true,
    heroImage: true,
    trustLogos: { populate: { image: true } },
    challengePhoto: true,
    researchQuestionItems: { populate: { image: true, icon: true } },
    approachSteps: { populate: { image: true, icon: true } },
    uncoveredPanels: { populate: { image: true, icon: true } },
    impactImage: true,
    impactItems: { populate: { image: true, icon: true } },
    faqItems: true,
  };
}

export default factories.createCoreService('api::case-study.case-study');
