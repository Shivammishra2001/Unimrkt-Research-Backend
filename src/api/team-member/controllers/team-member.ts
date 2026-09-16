import { factories } from '@strapi/strapi';
import { buildTeamMemberPopulate } from '../services/team-member';

/** GET /team-members — forces the photo populate and a default
 * order:asc sort (matching this node's own top-to-bottom, left-to-right
 * grid sequence) when the caller didn't specify one, same shape as
 * gallery-item's list `find` override. */
export default factories.createCoreController('api::team-member.team-member', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: buildTeamMemberPopulate(),
      sort: ctx.query.sort ?? ['order:asc'],
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },
}));
