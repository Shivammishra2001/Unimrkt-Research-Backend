import { factories } from '@strapi/strapi';
import { BLOCK_POPULATE } from '../../service/services/service';

export function buildIndustryListPopulate() {
  return { icon: true };
}

export function buildIndustryPopulate() {
  return {
    icon: true,
    seo: { populate: ['shareImage'] },
    blocks: { on: BLOCK_POPULATE },
  };
}

export default factories.createCoreService('api::industry.industry');
