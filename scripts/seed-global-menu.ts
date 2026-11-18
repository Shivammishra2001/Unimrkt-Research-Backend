/**
 * Fills the new header / mega-menu controls in "Global Header, Footer & SEO" with the menu the site already shows,
 * so nothing changes visually and editors start from real values:
 *
 *   - Primary Nav: each item gets its Menu type (Services -> services_mega_menu, Industries -> industries_mega_menu,
 *     items with children -> dropdown, the rest -> link), Visible = on, and — for internal links — the matching Page
 *     relation. Only empty fields are filled.
 *   - Services Mega-Menu (only if not set yet): every published top-level service category in its current order,
 *     the "Research Services" eyebrow and the two footer links.
 *   - Industries Mega-Menu (only if not set yet): the five sector groups the menu shows today, with their industries,
 *     the "Other Industries" fallback label, intro and footer links ({count} = number of industries).
 *   - First run only: every existing Page gets "Show in header" OFF except the pages already linked in the header, so
 *     the auto-add hook only ever adds pages created from now on.
 *
 * Idempotent: re-running changes nothing once the fields are filled. Republishes Global only when something changed.
 *
 * Run once per environment:  npm run seed:global-menu
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';

const GLOBAL_UID = 'api::global.global';
const SERVICE_UID = 'api::service.service';
const INDUSTRY_UID = 'api::industry.industry';
const PAGE_UID = 'api::page.page';

/** Same sector buckets as the live menu (Frontend/views/sections/nav/industryGroups.ts). */
const GROUPS: Array<{ label: string; match: RegExp }> = [
  { label: 'Automotive, Mobility & Industrial', match: /automotive|transport|aerospace|defen[cs]e|manufactur|chemical|construction|architecture|logistic/ },
  { label: 'Energy & Natural Resources', match: /energy|utilit|oil|gas|metal|mining|agri/ },
  { label: 'BFSI, Tech & Telecom', match: /bank|financ|fintech|insurance|telecom|\bit\b|^it-|technology|software/ },
  { label: 'Healthcare & Professional Services', match: /health|life-science|pharma|education|legal|professional|business-services|real-estate/ },
  { label: 'Consumer, Retail & Media', match: /fmcg|retail|cpg|food|beverage|commerce|marketplace|fashion|textile|media|entertainment|sport|travel|tourism|hospitality/ },
];

const link = (label: string, href: string, variant = 'primary') => ({ label, href, isExternal: false, variant });
const clean = (href?: string | null) => (href ?? '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
const slugForHref = (href?: string | null) => {
  if (!href || !href.startsWith('/') || href.includes('#')) return null;
  const path = clean(href);
  return path === '/' ? 'home' : path.slice(1).includes('/') ? null : path.slice(1);
};

function detectMenuType(item: any): string {
  if (clean(item.href) === '/services') return 'services_mega_menu';
  if (/industr/i.test(item.href ?? '') || /^industries$/i.test(String(item.label).trim())) return 'industries_mega_menu';
  return (item.children ?? []).length > 0 ? 'dropdown' : 'link';
}

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  try {
    const global = await strapi.documents(GLOBAL_UID).findFirst({
      status: 'draft',
      populate: {
        primaryNav: { populate: { children: true, page: { fields: ['documentId', 'slug'] } } },
        servicesMenu: { populate: '*' },
        industriesMenu: { populate: '*' },
      },
    });
    if (!global) {
      // eslint-disable-next-line no-console
      console.log('[global-menu] no Global entry — nothing to do');
      return;
    }
    const firstRun = !global.servicesMenu && !global.industriesMenu;
    const data: Record<string, unknown> = {};

    // --- Primary Nav: fill menu type / visibility / page relation where empty ---
    const pages = await strapi.documents(PAGE_UID).findMany({ status: 'draft', fields: ['documentId', 'slug'], limit: 500 });
    const pageBySlug = new Map<string, string>(pages.map((p: any) => [p.slug, p.documentId]));
    let navChanged = false;
    const primaryNav = (global.primaryNav ?? []).map((i: any) => {
      const menuType = i.menuType ?? detectMenuType(i);
      const isVisible = i.isVisible ?? true;
      const slug = slugForHref(i.href);
      const page = i.page?.documentId ?? (slug ? pageBySlug.get(slug) ?? null : null);
      if (menuType !== i.menuType || isVisible !== i.isVisible || page !== (i.page?.documentId ?? null)) navChanged = true;
      return {
        id: i.id,
        label: i.label,
        href: i.href ?? null,
        isExternal: i.isExternal ?? false,
        menuType,
        isVisible,
        showIndicator: i.showIndicator ?? false,
        page,
        children: (i.children ?? []).map((c: any) => ({ id: c.id, label: c.label, href: c.href, isExternal: c.isExternal ?? false })),
      };
    });
    if (navChanged) data.primaryNav = primaryNav;

    // --- Services mega-menu ---
    if (!global.servicesMenu) {
      const categories = await strapi.documents(SERVICE_UID).findMany({
        status: 'published',
        filters: { parent: { id: { $null: true } } },
        fields: ['documentId', 'title'],
        sort: ['title:asc'],
        limit: 100,
      });
      data.servicesMenu = {
        eyebrow: 'Research Services',
        autoIncludeNew: true,
        categories: categories.map((c: any) => ({ service: c.documentId, isVisible: true })),
        exploreLink: link('Explore All Research Services', '/services'),
        ctaLink: link('Need a Custom Study? Talk to Experts', '/contact'),
      };
    }

    // --- Industries mega-menu ---
    if (!global.industriesMenu) {
      const industries = await strapi.documents(INDUSTRY_UID).findMany({ status: 'published', fields: ['documentId', 'slug', 'title'], limit: 500 });
      const groups = GROUPS.map((g) => ({
        label: g.label,
        industries: industries.filter((ind: any) => GROUPS.findIndex((x) => x.match.test(ind.slug)) === GROUPS.indexOf(g)).map((ind: any) => ind.documentId),
      })).filter((g) => g.industries.length > 0);
      data.industriesMenu = {
        eyebrow: 'Industries We Serve',
        intro: 'Sector-specific research across {count} industries and 90+ countries.',
        groups,
        otherGroupLabel: 'Other Industries',
        viewAllLink: link('View All {count} Industries', '/industries'),
        ctaLink: link('Request Industry Sample / Proposal', '/contact'),
      };
    }

    if (Object.keys(data).length > 0) {
      const wasLive = await strapi.documents(GLOBAL_UID).findFirst({ status: 'published', fields: ['id'] });
      await strapi.documents(GLOBAL_UID).update({ documentId: global.documentId, data });
      if (wasLive) await strapi.documents(GLOBAL_UID).publish({ documentId: global.documentId });
      // eslint-disable-next-line no-console
      console.log(`[global-menu] Global updated: ${Object.keys(data).join(', ')}`);
    } else {
      // eslint-disable-next-line no-console
      console.log('[global-menu] Global menu fields already set — unchanged');
    }

    // --- First run: existing pages stay out of the header unless they are already in it ---
    if (firstRun) {
      const inHeader = new Set(primaryNav.map((i: any) => i.page).filter(Boolean));
      // Database-level update: changes only this flag, fires no page lifecycles and publishes nothing.
      await strapi.db.query(PAGE_UID).updateMany({ where: {}, data: { showInHeader: false } });
      if (inHeader.size) await strapi.db.query(PAGE_UID).updateMany({ where: { documentId: { $in: [...inHeader] } }, data: { showInHeader: true } });
      // eslint-disable-next-line no-console
      console.log(`[global-menu] existing pages: "Show in header" off, except ${inHeader.size} already in the header`);
    }
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error('[global-menu] failed:', err);
    process.exit(1);
  },
);
