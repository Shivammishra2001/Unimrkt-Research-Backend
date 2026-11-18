/**
 * Auto-adds a newly published Page to the header navigation (Global Header, Footer & SEO → Primary Nav).
 *
 * Called from the Page lifecycle hooks. A page is added only when ALL of these hold:
 *   - the event is for the published version (drafts never touch the menu),
 *   - its "Show in header" toggle is on and its visibility switch is not off,
 *   - no nav item (or dropdown child) already points at it — by Page relation or by URL.
 * The new item is a plain link appended at the end, linked to the Page by relation (so a later slug change follows
 * it). Editors can then drag it, rename it, hide it (Visible off) or delete it; it is never re-added while an item for
 * the page exists, and deleting the item while the toggle stays on would re-add it on the page's next publish — turn
 * the toggle off to keep a page out of the header.
 *
 * Runs deferred (after the page's own write transaction has committed) and never throws: a menu-sync problem must
 * not block saving a page.
 */
const GLOBAL_UID = 'api::global.global';

type NavChild = { id?: number; label: string; href: string; isExternal?: boolean | null };
type NavItem = {
  id?: number;
  label: string;
  href?: string | null;
  isExternal?: boolean | null;
  menuType?: string | null;
  isVisible?: boolean | null;
  showIndicator?: boolean | null;
  page?: { documentId: string } | null;
  children?: NavChild[];
};

export const pageHref = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);
const clean = (href?: string | null) => (href ?? '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';

export async function addPageToHeader(strapi: any, page: { documentId: string; slug: string; title: string }) {
  const global = await strapi.documents(GLOBAL_UID).findFirst({
    status: 'draft',
    populate: { primaryNav: { populate: { children: true, page: { fields: ['documentId'] } } } },
  });
  if (!global) return false;

  const nav: NavItem[] = global.primaryNav ?? [];
  const href = pageHref(page.slug);
  const already = nav.some(
    (i) => i.page?.documentId === page.documentId || clean(i.href) === href || (i.children ?? []).some((c) => clean(c.href) === href),
  );
  if (already) return false;

  // Re-send every existing item with its id (so it is kept as-is) plus the new one at the end.
  const primaryNav = [
    ...nav.map((i) => ({
      id: i.id,
      label: i.label,
      href: i.href ?? null,
      isExternal: i.isExternal ?? false,
      menuType: i.menuType ?? 'link',
      isVisible: i.isVisible ?? true,
      showIndicator: i.showIndicator ?? false,
      page: i.page?.documentId ?? null,
      children: (i.children ?? []).map((c) => ({ id: c.id, label: c.label, href: c.href, isExternal: c.isExternal ?? false })),
    })),
    { label: page.title.slice(0, 40), href, isExternal: false, menuType: 'link', isVisible: true, showIndicator: false, page: page.documentId, children: [] },
  ];

  const wasLive = await strapi.documents(GLOBAL_UID).findFirst({ status: 'published', fields: ['id'] });
  await strapi.documents(GLOBAL_UID).update({ documentId: global.documentId, data: { primaryNav } });
  if (wasLive) await strapi.documents(GLOBAL_UID).publish({ documentId: global.documentId });
  strapi.log.info(`[header-sync] added page "${page.slug}" to the header navigation`);
  return true;
}

/** Lifecycle entry point: filters the event, then runs the sync after the current transaction. */
export function syncPageToHeader(strapi: any, result: any) {
  if (!result?.publishedAt || result.showInHeader !== true || result.isActive === false || !result.slug || !result.documentId) return;
  const page = { documentId: result.documentId, slug: result.slug, title: result.title || result.slug };
  setTimeout(() => {
    addPageToHeader(strapi, page).catch((err) => strapi.log.error(`[header-sync] could not add page "${page.slug}" to the header`, err));
  }, 0);
}
