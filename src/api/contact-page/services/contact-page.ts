import { factories } from '@strapi/strapi';

export function buildContactPagePopulate() {
  return {
    heroImage: true,
    heroCta: true,
    stats: true,
    offices: { populate: { image: true } },
    formImage: true,
    faqItems: true,
    workWithUsCta: true,
    workWithUsImage: true,
    seo: { populate: { shareImage: true } },
  };
}

export default factories.createCoreService('api::contact-page.contact-page');
