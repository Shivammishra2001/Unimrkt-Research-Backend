import { factories } from '@strapi/strapi';

export function buildTeamMemberPopulate() {
  return { photo: true };
}

export default factories.createCoreService('api::team-member.team-member');
