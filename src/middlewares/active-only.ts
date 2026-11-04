import type { Core } from '@strapi/strapi';
import { ACTIVE_COLLECTIONS, ACTIVE_FILTER } from '../utils/active';

/**
 * Registered as `global::active-only`. For public `GET /api/<collection>` list/detail reads of the collections that have an
 * `isActive` switch, ANDs "active (or never set)" into the caller's filters so inactive entries never leave the API. The slug-based
 * custom handlers apply the same filter themselves (they query the Document Service directly). Draft/preview requests (full-access
 * token only, enforced by `is-preview-allowed`) are left untouched.
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) =>
  async (ctx: any, next: () => Promise<unknown>) => {
    if (ctx.method === 'GET' && ctx.path.startsWith('/api/')) {
      const [collection] = ctx.path.slice('/api/'.length).split('/');
      const isDraft = ctx.query?.status === 'draft' || ctx.query?.publicationState === 'preview';
      if (ACTIVE_COLLECTIONS.has(collection) && !isDraft) {
        const existing = ctx.query?.filters;
        ctx.query = {
          ...ctx.query,
          filters: existing ? { $and: [existing, ACTIVE_FILTER] } : ACTIVE_FILTER,
        };
      }
    }
    return next();
  };
