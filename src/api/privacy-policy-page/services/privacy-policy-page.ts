import { factories } from '@strapi/strapi';

export function buildPrivacyPolicyPagePopulate() {
  return {
    heroImage: true,
    tocItems: true,
    lawfulPurposesList: true,
    lawfulBasisList: true,
    panelDataSourcesList: true,
    seo: { populate: { shareImage: true } },
  };
}

export default factories.createCoreService('api::privacy-policy-page.privacy-policy-page');
