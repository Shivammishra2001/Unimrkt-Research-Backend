import type { Core } from '@strapi/strapi';

/**
 * Permission bootstrap.
 *
 * The exact set of content-API actions the storefront (frontend/) must
 * reach WITHOUT a bearer token — this is the "must be enabled" column of
 * API_SPECIFICATION.md §4's auth & permissions matrix, i.e. every action
 * the frontend's static generation (SSG) and published-content reads
 * depend on: the page/service slug lookups, the services listing, the
 * global nav/footer, and the industries listing.
 *
 * (`city`/`city-service-override` and their location-merge endpoints —
 * the demo city+service combo feature — were removed entirely, backend
 * and frontend both, once the Google Sheet-migrated Services hierarchy
 * replaced them as the site's only active Services content.)
 *
 * Every other action — all writes, and the plain core CRUD on
 * `testimonial` that the frontend never calls directly — is deliberately
 * left disabled on both roles here. Granting those is an admin-panel/
 * API-token decision this bootstrap does not make silently.
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
  'api::service.service.findTree',
  'api::service.service.findSlugs',
  'api::service.service.findBySlug',
  // Industries (Google Sheet IA migration) — same 4-action shape as
  // service: plain find (list), findOne (core detail, harmless to leave
  // on), plus the custom slug-based lookups the frontend actually calls.
  'api::industry.industry.find',
  'api::industry.industry.findOne',
  'api::industry.industry.findSlugs',
  'api::industry.industry.findBySlug',
  // Gallery Item (Strapi migration of the /gallery page's static
  // fixture) — plain list + core detail, no slug-based lookups since
  // the frontend always fetches the whole collection in one request.
  'api::gallery-item.gallery-item.find',
  'api::gallery-item.gallery-item.findOne',
  // Services Page (singleType) — /services' hero/intro/value-props/
  // workflow/FAQ/CTA copy, migrated off hardcoded JSX. Single types only
  // ever expose `find` (there's exactly one record, no list/detail split).
  'api::services-page.services-page.find',
  // Blog (/blogs page, Figma node 522:4719) — plain find (populate=* per
  // the frontend's controllers/blog.ts), findOne (core detail, harmless
  // to leave on), plus the custom slug-based lookups the frontend calls.
  'api::blog.blog.find',
  'api::blog.blog.findOne',
  'api::blog.blog.findSlugs',
  'api::blog.blog.findBySlug',
  // Category (dynamic replacement for blog's old fixed category enum) —
  // plain list + core detail; the frontend's /blogs filter tabs and each
  // post's category badge both read through the blog.category relation
  // populate, but a standalone `GET /categories` (controllers/category.ts
  // on the frontend) is what lets the tab list itself be dynamic.
  'api::category.category.find',
  'api::category.category.findOne',
  // Our Company Page (/our-company, Figma node 617:7561, file
  // foaJFuv0vRX8nD43o0ylgB) — a dedicated singleType, not a `page`
  // dynamiczone entry. Single types only ever expose `find`.
  'api::our-company-page.our-company-page.find',
  // Contact Page (/contact, Figma node 637:10433, file
  // foaJFuv0vRX8nD43o0ylgB) — a dedicated singleType.
  'api::contact-page.contact-page.find',
  // Contact Submission — the /contact form's lead-capture write target.
  // `create` only (see that content type's own routes.ts: find/findOne/
  // update/delete are never registered at all, so granting them here
  // would be a no-op even if it weren't already the wrong call) — a
  // visitor can submit a lead but never read, list, or tamper with
  // anyone else's.
  'api::contact-submission.contact-submission.create',
  // Work With Us Page (/work-with-us, Figma node 924:23216, file
  // foaJFuv0vRX8nD43o0ylgB) — a dedicated singleType.
  'api::work-with-us-page.work-with-us-page.find',
  // Job Application — the "Apply Now" modal's write target (Figma node
  // 924:23856). `create` only, same reasoning as Contact Submission.
  'api::job-application.job-application.create',
  // Case Study (/case-study, Figma node 1023:45614) — individual case
  // study cards. Read-only: `find`/`findOne`, no write route exists.
  'api::case-study.case-study.find',
  'api::case-study.case-study.findOne',
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
