import { factories } from '@strapi/strapi';
import { buildServicePopulate, BLOCK_POPULATE } from '../../service/services/service';

/**
 * Populate for the merge endpoint (`city.city-service.findByLocation`) —
 * NOT this content type's own `find`/`findOne` default. A direct
 * `GET /api/city-service-overrides` request gets whatever populate the
 * caller supplies (or none).
 */
export function buildOverridePopulate() {
  return {
    city: { populate: { localMeta: { populate: ['shareImage'] } } },
    service: { populate: buildServicePopulate() },
    overrideSeo: { populate: ['shareImage'] },
    overrideBlocks: { on: BLOCK_POPULATE },
  };
}

export default factories.createCoreService('api::city-service-override.city-service-override');
