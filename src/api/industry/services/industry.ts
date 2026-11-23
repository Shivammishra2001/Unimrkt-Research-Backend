import { factories } from '@strapi/strapi';

export function buildIndustryListPopulate() {
  return { icon: true };
}

/** Deep-populates the `sections` dynamic zone — every section component and
 * its nested media/cards — plus the flat `icon`. Each industry page is an
 * ordered list of section blocks (Hero, Overview, … FAQ, Bottom CTA, SEO)
 * that an editor arranges and collapses in the Admin. */
export function buildIndustryPopulate() {
  return {
    icon: true,
    sections: {
      on: {
        'industry-sections.hero': { populate: { image: true, actions: true } },
        'industry-sections.overview': { populate: { cta: true, image: true, partners: { populate: { image: true } } } },
        'industry-sections.why-research': { populate: { cards: { populate: { image: true, icon: true } } } },
        'industry-sections.expertise': { populate: { items: { populate: { image: true, icon: true } } } },
        'industry-sections.challenges': { populate: { cards: { populate: { image: true, icon: true } } } },
        'industry-sections.who-we-serve': { populate: { cards: { populate: { image: true, icon: true } } } },
        'industry-sections.methodologies': { populate: { items: { populate: { image: true } } } },
        'industry-sections.empower': { populate: { cta: true, image: true } },
        'industry-sections.enquiry': { populate: { image: true } },
        'industry-sections.blogs-band': { populate: {} },
        'industry-sections.faq': { populate: { cta: true, items: true } },
        'industry-sections.case-studies': { populate: { cta: true, items: { populate: { image: true } } } },
        'industry-sections.about': { populate: {} },
        'industry-sections.cta-banner': { populate: { action: true } },
        'shared.seo': { populate: { shareImage: true } },
      },
    },
  };
}

export default factories.createCoreService('api::industry.industry');
