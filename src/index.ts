import type { Core } from '@strapi/strapi';

/**
 * Permission bootstrap.
 *
 * The exact set of content-API actions the storefront (frontend/) must
 * reach WITHOUT a bearer token — this is the "must be enabled" column of
 * API_SPECIFICATION.md §4's auth & permissions matrix, i.e. every action
 * the frontend's static generation (SSG) and published-content reads
 * depend on: the page/service slug lookups, the services listing, the
 * global nav/footer, and the location merge endpoints.
 *
 * Every other action — all writes, and the plain core CRUD on
 * `city`/`testimonial`/`city-service-override` that the frontend never
 * calls directly — is deliberately left disabled on both roles here.
 * Granting those is an admin-panel/API-token decision this bootstrap
 * does not make silently.
 *
 * Both `public` and `authenticated` roles get the identical matrix:
 * nothing in the source docs asks for a broader authenticated-only set,
 * so mirroring is the minimal-assumption choice — an authenticated
 * end user gets at least the same published-read access as an anonymous
 * one, never less, never silently more.
 */
const REQUIRED_PERMISSIONS: string[] = [
  'api::global.global.find',
  'api::page.page.findSlugs',
  'api::page.page.findBySlug',
  'api::service.service.find',
  'api::service.service.findOne',
  'api::service.service.findSlugs',
  'api::service.service.findBySlug',
  'api::city.city-service.findByLocation',
  'api::city.city-service.findCombinations',
];

const ROLE_TYPES = ['public', 'authenticated'] as const;

async function grantPermissions(strapi: Core.Strapi, roleType: (typeof ROLE_TYPES)[number]) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });

  if (!role) {
    strapi.log.warn(`[permissions-bootstrap] Role "${roleType}" not found — skipping`);
    return;
  }

  await Promise.all(
    REQUIRED_PERMISSIONS.map(async (action) => {
      const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: { action, role: role.id },
      });

      if (existing) {
        if (!existing.enabled) {
          await strapi.db.query('plugin::users-permissions.permission').update({
            where: { id: existing.id },
            data: { enabled: true },
          });
          strapi.log.info(`[permissions-bootstrap] Enabled "${action}" for role "${roleType}"`);
        }
        return;
      }

      // Should not normally happen — the users-permissions plugin syncs a
      // disabled permission row for every registered content-API action
      // (core AND custom routes) during its own bootstrap, which runs
      // before this application bootstrap. Created defensively anyway so
      // a cold/first boot can never silently no-op if that sync hasn't
      // run yet.
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, role: role.id, enabled: true },
      });
      strapi.log.info(`[permissions-bootstrap] Created + enabled "${action}" for role "${roleType}"`);
    })
  );
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    for (const roleType of ROLE_TYPES) {
      // eslint-disable-next-line no-await-in-loop -- sequential on purpose, keeps bootstrap logs ordered
      await grantPermissions(strapi, roleType);
    }
  },
};
