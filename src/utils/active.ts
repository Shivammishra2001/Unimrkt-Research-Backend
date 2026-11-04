/**
 * "Page Active / Inactive" switch. Entries have an `isActive` boolean (default true); an inactive entry must disappear from every
 * public read so the storefront answers 404. Rows saved before the field existed hold NULL, so NULL counts as active.
 *
 * Draft reads (preview) are already restricted to full-access API tokens by `global::is-preview-allowed`, so they skip the filter and
 * let the content team preview a switched-off page.
 */
export const ACTIVE_FILTER = {
  $or: [{ isActive: { $eq: true } }, { isActive: { $null: true } }],
};

export function activeFilter(isDraft = false): Record<string, unknown> {
  return isDraft ? {} : ACTIVE_FILTER;
}

/** Collections that carry `isActive`, keyed by their REST path segment. */
export const ACTIVE_COLLECTIONS = new Set(['pages', 'services', 'industries', 'blogs', 'case-studies']);
