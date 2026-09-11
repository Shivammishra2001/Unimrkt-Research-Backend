import { factories } from '@strapi/strapi';

export function buildBlogPopulate() {
  return {
    coverImage: true,
    category: true,
    faqItems: true,
    seo: { populate: { shareImage: true } },
  };
}

export default factories.createCoreService('api::blog.blog');
