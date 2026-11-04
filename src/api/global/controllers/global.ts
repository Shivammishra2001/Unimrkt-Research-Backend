import { factories } from '@strapi/strapi';
import { buildGlobalPopulate } from '../services/global';
import { getInactivePaths, pointsAtInactive } from '../../../utils/inactive-paths';

export default factories.createCoreController('api::global.global', ({ strapi }) => ({
  /**
   * Overridden so an earlier version's bug — reading `populate` from
   * the query string — can't recur: this forces `buildGlobalPopulate()`
   * unconditionally, overwriting any caller-supplied populate.
   */
  async find(ctx) {
    ctx.query = { ...ctx.query, populate: buildGlobalPopulate() };
    const isDraft = ctx.query.status === 'draft';

    // super.find() returns bare `null` (not `{ data: null, meta: {} }`) when
    // the Global singleType has no entry yet — an unseeded DB, most likely.
    // Destructuring that directly throws; guard it so this returns a normal
    // empty response instead of a 500.
    const result = await super.find(ctx);
    const { data, meta } = result ?? { data: null, meta: {} };

    // Menus never link to a page whose "Page visibility" switch is OFF (preview keeps everything so editors see the full menu).
    if (data && !isDraft) {
      const inactive = await getInactivePaths(strapi);
      if (inactive.size > 0) {
        const keep = (item: { href?: string | null }) => !pointsAtInactive(item.href, inactive);
        const nav = (data as any).primaryNav;
        if (Array.isArray(nav)) {
          (data as any).primaryNav = nav
            .filter(keep)
            .map((item: any) => (Array.isArray(item.children) ? { ...item, children: item.children.filter(keep) } : item));
        }
        const cols = (data as any).footerColumns;
        if (Array.isArray(cols)) {
          (data as any).footerColumns = cols.map((col: any) => ({ ...col, links: (col.links ?? []).filter(keep) }));
        }
        const cta = (data as any).navCta;
        if (cta && !keep(cta)) (data as any).navCta = null;
      }
    }

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return { data, meta };
  },
}));
