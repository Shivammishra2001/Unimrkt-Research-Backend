/**
 * One-time script: reorders the Strapi Admin Content-Manager **edit
 * view** field layout for every content type that has a fixed,
 * page-shaped set of named fields, so it matches — field for field, top
 * to bottom — the exact order those fields are rendered on the live
 * frontend page:
 *   - api::industry.industry   (/industries/[slug])
 *   - api::service.service     (/services/[slug])
 *   - api::global.global       (Navbar + Footer, on every page)
 *   - api::testimonial.testimonial (rendered wherever blocks.testimonials appears)
 *   - api::blog.blog           (/blogs/[slug] — already correctly ordered;
 *     pinned explicitly anyway so a future field addition can't silently
 *     drift the way services-page's did)
 *
 * `api::page.page` (the generic `blocks` dynamiczone that backs the
 * Home page, About, and every other catch-all route) is deliberately
 * NOT included — see the note above PAGE_UID below for why it can't
 * drift the way the others did, so there's nothing to pin.
 * `api::gallery-item.gallery-item` is also excluded — a single gallery
 * tile renders only one image, so its fields (title/category/caption)
 * have no visual top-to-bottom relationship to reorder.
 *
 * Why this is needed: Strapi auto-generates/merges the admin edit-view
 * layout by APPENDING newly-added schema attributes to the end of
 * whatever layout is already stored in the core-store, in whatever
 * order they were added to schema.json over time (see
 * `@strapi/content-manager`'s `syncLayouts()` /
 * `appendToEditLayout()`). Every content type below had fields added
 * incrementally across separate schema edits, so the persisted admin
 * layout order does NOT reliably match the live JSX render order.
 * Confirmed mismatches found by inspection:
 *   - service.service: `features` (Capabilities, rendered 4th) was
 *     declared 5th in schema.json, ahead of every hero/detail field.
 *   - services-page.services-page: `workflow` (Frontend/views/services/
 *     ResearchProcessSection, rendered right after the category grid)
 *     was declared AFTER the value-props fields, which render later.
 *   - global.global: `footerTagline` (Frontend/views/sections/
 *     Footer.tsx — renders right under the logo, before the footer
 *     columns) was declared last, after `defaultSeo`.
 *   - testimonial.testimonial: `avatar` (Frontend/views/sections/
 *     TestimonialsView.tsx's TestimonialCard — renders before the
 *     author's name) was declared after `authorName`.
 *
 * Every field order below is NOT invented — each was extracted by
 * reading the relevant view file's JSX return statement top to bottom
 * and noting exactly which Strapi field(s) each rendered component
 * consumes:
 *   - Frontend/views/industries/IndustryDetailView.tsx
 *   - Frontend/views/services/ServiceDetailView.tsx
 *   - Frontend/views/services/ServiceListingView.tsx
 *   - Frontend/views/sections/Navbar.tsx + Footer.tsx
 *   - Frontend/views/sections/TestimonialsView.tsx
 *   - Frontend/views/blog/BlogDetailView.tsx
 * Fields that exist on a model but are NOT rendered by its page/component
 * (identity, listing-card, or SEO-only fields — e.g. title/slug/summary
 * on industry/service, or defaultSeo on global) keep their original
 * schema.json relative order and are grouped where the JSX gives no
 * ordering signal for them (see each list's own comments below).
 *
 * Every field is placed on its own row (one field per row) so the
 * admin form is unambiguously single-column top-to-bottom — matching
 * "as an editor scrolls down" literally, with no left/right same-row
 * ambiguity.
 *
 * Run once with:  npx ts-node scripts/reorder-content-manager-layout.ts
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';

const INDUSTRY_UID = 'api::industry.industry';
const SERVICE_UID = 'api::service.service';
const GLOBAL_UID = 'api::global.global';
const TESTIMONIAL_UID = 'api::testimonial.testimonial';
const BLOG_UID = 'api::blog.blog';

// `api::page.page` (title, slug, seo, blocks) intentionally has no
// entry here. The one thing it renders — `blocks` — is a dynamiczone:
// its component order is per-entry DATA that an editor already
// arranges by dragging inside the zone, and BlockDispatcher renders
// `page.blocks` in that exact array order with no other ordering layer
// in between. There's no separate "admin form position" for a
// dynamiczone's contents that could ever drift from the live page the
// way a fixed named field can — so this is the one content type this
// script cannot improve, including for the Home page it backs.

// Industry is now a lean core + a `sections` dynamic zone (the page content
// lives as draggable, collapsible section blocks an editor arranges per
// entry). Only the flat top-level fields have a fixed admin order; the DZ
// block order is per-entry data, not an admin-layout concern.
const INDUSTRY_FIELD_ORDER = [
  'title',
  'slug',
  'isActive',
  'legacyUrl',
  'suggestedUrl',
  'summary',
  'icon',
  'sections',
];

// Order = exact top-to-bottom JSX render sequence of
// Frontend/views/services/ServiceDetailView.tsx.
// Order = the Level-3 sub-service page (Frontend/views/services/subservice/SubServiceView.tsx, Figma 859:15301), top
// to bottom — the template most Service entries use. Fields only the Level-2 category page renders
// (ServiceDetailView.tsx) sit after About, each labelled in the admin (see SERVICE_LEVEL2_ONLY).
const SERVICE_FIELD_ORDER = [
  // --- core info (routing, hierarchy, listing cards) ---
  'title',
  'slug',
  'parent',
  'summary',
  'isActive',
  'thumbnail',
  'listingDescription',
  'listingIcon',
  'children',
  'legacyUrl',
  'suggestedUrl',
  // --- 1. Hero ---
  'heroEyebrow',
  'heroHeading',
  'heroSubheading',
  'heroImage',
  'heroActions',
  // --- 2. Key stats / credentials ---
  'credentialsHeading',
  'credentials',
  'credentialsBody',
  // --- 3. Overview ("What are …?") ---
  'overviewEyebrow',
  'overviewHeading',
  'overviewBody',
  'overviewImage',
  'overviewFeatures',
  // --- 4. Why … ? ---
  'whyEyebrow',
  'whyHeading',
  'whyBody',
  'whyItems',
  // --- 5. Process / methodologies ---
  'methodologiesEyebrow',
  'methodologiesHeading',
  'methodologiesBody',
  'methodologies',
  // --- 6. What We Can Measure ---
  'measureEyebrow',
  'measureHeading',
  'measureBody',
  'measureItems',
  // --- 7. Quality First ---
  'qualityEyebrow',
  'qualityHeading',
  'qualityBody',
  'qualityImage',
  'qualityItems',
  // --- 8. Technology panels ---
  'techEyebrow',
  'techHeading',
  'techBody',
  'techPanels',
  // --- 9. Latest Blogs band + FAQ (band fields override Global; empty = inherit) ---
  'blogBand',
  'faqBand',
  'faqItems',
  // --- 10. About ---
  'aboutEyebrow',
  'aboutHeading',
  'aboutBody',
  // --- 11. Final CTA band (override; empty = Global default) ---
  'finalCta',
  // --- Level-2 category pages only (trust logos, capabilities, industries served, enquiry form) ---
  'trustHeading',
  'trustLogos',
  'capabilitiesEyebrow',
  'capabilitiesHeading',
  'capabilitiesBody',
  'features',
  'industriesEyebrow',
  'industriesHeading',
  'industriesBody',
  'industriesServed',
  'enquiryEyebrow',
  'enquiryHeading',
  'enquiryBody',
  'enquiryImage',
  // --- SEO ---
  'seo',
];

/** Fields rendered only on Level-2 category pages (e.g. Primary Research) — the admin shows this note under each. */
const SERVICE_LEVEL2_ONLY = [
  'methodologiesBody',
  'credentialsBody',
  'overviewFeatures',
  'trustHeading',
  'trustLogos',
  'capabilitiesEyebrow',
  'capabilitiesHeading',
  'capabilitiesBody',
  'features',
  'industriesEyebrow',
  'industriesHeading',
  'industriesBody',
  'industriesServed',
  'enquiryEyebrow',
  'enquiryHeading',
  'enquiryBody',
  'enquiryImage',
];
const LEVEL2_NOTE = 'Level-2 category pages only (e.g. Primary Research) — not shown on sub-service pages.';


// Order = Navbar (top of every page) then Footer (bottom of every
// page) — the two sitewide chrome components this content type feeds,
// read from Frontend/views/sections/Navbar.tsx and Footer.tsx.
// `defaultSeo` renders nothing visually (it's the fallback <meta> tag
// source for pages with no own SEO) so it's placed last, after both.
const GLOBAL_FIELD_ORDER = [
  // --- Navbar ---
  'siteName',
  'logo', // shared by Navbar AND Footer (Footer reuses the same field — see normalizeGlobal())
  'logoDark',
  'primaryNav',
  'navCta',
  'servicesMenu',
  'industriesMenu',
  // --- shared closing bands (rendered between page content and the footer on most pages) ---
  'blogBand',
  'faqBand',
  'finalCta',
  // --- Footer (Footer.tsx's own top-to-bottom order: logo already
  // covered above, then tagline, then columns, then socials, then the
  // copyright bar last — this was the confirmed mismatch: schema.json
  // had `footerTagline` declared last, after `defaultSeo`) ---
  'footerTagline',
  'footerBadges',
  'footerColumns',
  'socialHeading',
  'socialLinks',
  'copyright',
  // --- floating chat panel (every page) ---
  'chatWidget',
  // --- not rendered anywhere on the page; global <meta> fallback only ---
  'defaultSeo',
];

// Order = Frontend/views/sections/TestimonialsView.tsx's TestimonialCard:
// quote, then avatar, then the author byline (name/role/company) — this
// was the confirmed mismatch: schema.json declared `avatar` after
// `authorName`. `companyLogo`/`rating`/`featured` are on the model but
// never rendered by TestimonialCard, so they keep their original
// relative schema order at the end.
const TESTIMONIAL_FIELD_ORDER = ['quote', 'avatar', 'authorName', 'authorRole', 'company', 'companyLogo', 'rating', 'featured'];

// Order = Frontend/views/blog/BlogDetailView.tsx: title -> coverImage ->
// body -> faqItems is the only part of this shape that's actually
// rendered top-to-bottom on the page; already correct in schema.json
// today (no mismatch found) — pinned explicitly anyway so a future
// field addition can't silently drift the way services-page's did.
// slug/excerpt/category/order/seo aren't rendered on the detail page
// itself (used by the /blogs listing cards, routing, and <meta> tags
// instead), so they keep their original schema.json relative order.
const BLOG_FIELD_ORDER = ['title', 'slug', 'excerpt', 'category', 'coverImage', 'body', 'order', 'faqItems', 'seo'];

type EditLayoutRow = Array<{ name: string; size: number }>;

/** Rebuilds `layouts.edit` as one field per row, in `fieldOrder`'s exact
 * sequence, using each attribute's real Content-Manager field size
 * (falls back to the size already on file for that field, if any, else
 * the plugin's own type-default) so widths stay visually normal —
 * only the order changes. */
function buildEditLayout(
  strapi: any,
  uid: string,
  fieldOrder: string[],
  existingEdit: EditLayoutRow[]
): EditLayoutRow[] {
  const schemaAttributes = strapi.contentTypes[uid].attributes;
  const fieldSizes = strapi.plugin('content-manager').service('field-sizes');

  const existingSizeByName = new Map<string, number>();
  for (const row of existingEdit || []) {
    for (const el of row) existingSizeByName.set(el.name, el.size);
  }

  // At runtime `strapi.contentTypes[uid].attributes` also carries
  // Strapi's own system attributes (createdAt/updatedAt/publishedAt/
  // createdBy/updatedBy/locale/localizations) alongside the custom
  // schema.json ones. Content-Manager's own `hasEditableAttribute()`
  // (see @strapi/content-manager's utils/configuration/attributes.js)
  // excludes exactly this set from the edit view — they're never
  // schema.json fields and were never part of the JSX inspection, so
  // they're excluded here the same way rather than guessed into a
  // position.
  const SYSTEM_ATTRIBUTES = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations'];
  const schemaNames = Object.keys(schemaAttributes).filter((name) => !SYSTEM_ATTRIBUTES.includes(name));

  // The explicit order list must be an exact permutation of the
  // content type's remaining (custom, editable) schema attributes — a
  // mismatch means either the schema changed since this list was
  // written, or the JSX inspection missed a field. Fail loudly instead
  // of silently dropping a field from the admin form or inventing a
  // position for one that was never actually read from the JSX.
  const missingFromOrder = schemaNames.filter((name) => !fieldOrder.includes(name));
  const extraInOrder = fieldOrder.filter((name) => !schemaNames.includes(name));
  if (missingFromOrder.length > 0 || extraInOrder.length > 0) {
    throw new Error(
      `[reorder] ${uid}: field order list doesn't match schema attributes exactly.` +
        (missingFromOrder.length ? ` Missing from order: ${missingFromOrder.join(', ')}.` : '') +
        (extraInOrder.length ? ` Not in schema: ${extraInOrder.join(', ')}.` : '')
    );
  }

  return fieldOrder.map((name) => {
    const attribute = schemaAttributes[name];
    const size = existingSizeByName.get(name) ?? fieldSizes.getFieldSize(attribute.type).default;
    return [{ name, size }];
  });
}

async function reorderContentType(strapi: any, uid: string, fieldOrder: string[], descriptions: Record<string, string> = {}) {
  const contentTypesService = strapi.plugin('content-manager').service('content-types');
  const current = await contentTypesService.findConfiguration({ uid });
  const newEdit = buildEditLayout(strapi, uid, fieldOrder, current.layouts?.edit ?? []);

  // Optional per-field admin help text (edit-view description); every other metadata value is kept as stored.
  const metadatas = { ...(current.metadatas ?? {}) };
  for (const [name, description] of Object.entries(descriptions)) {
    const meta = metadatas[name] ?? {};
    metadatas[name] = { ...meta, edit: { ...(meta.edit ?? {}), description } };
  }

  await contentTypesService.updateConfiguration(
    { uid },
    {
      ...(Object.keys(descriptions).length ? { metadatas } : {}),
      layouts: {
        edit: newEdit,
        list: current.layouts?.list ?? [],
      },
    }
  );

  strapi.log.info(`[reorder] ${uid}: edit-view layout rewritten to ${newEdit.length} fields in JSX order.`);
}

// --- Batch 4: the remaining content types, in the order their page / card renders them ---
const CASE_STUDY_UID = 'api::case-study.case-study';
const TEAM_MEMBER_UID = 'api::team-member.team-member';
const GALLERY_ITEM_UID = 'api::gallery-item.gallery-item';
const CATEGORY_UID = 'api::category.category';
// Listing card (title/slug/visibility/category/excerpt/cover), then the detail page top to bottom
// (Frontend/views/case-study/detail/CaseStudyDetailView.tsx): hero, trust strip, challenge, research question,
// approach, what we uncovered, impact, FAQ.
const CASE_STUDY_FIELD_ORDER = [
  'title', 'slug', 'isActive', 'category', 'excerpt', 'coverImage',
  'heroSubheading', 'heroImage',
  'trustLogos',
  'challengeHeading', 'challengeBody', 'challengeBullets', 'challengeClosing', 'challengePhoto',
  'researchQuestionHeading', 'researchQuestionBody', 'researchQuestionItems',
  'approachHeading', 'approachBody', 'approachSteps',
  'uncoveredHeading', 'uncoveredBody', 'uncoveredPanels',
  'impactHeading', 'impactBody', 'impactImage', 'impactItems',
  'faqItems',
];
// /our-team card (photo, name, role) then the profile modal (bio, LinkedIn); sort order last.
const TEAM_MEMBER_FIELD_ORDER = ['photo', 'name', 'role', 'bio', 'linkedinUrl', 'order'];
// /gallery tile: the image, its alt/title, the filter category; caption + sort order last.
const GALLERY_ITEM_FIELD_ORDER = ['image', 'title', 'category', 'caption', 'order'];
// /blogs filter tab (name, short label) then routing; description + related posts last.
const CATEGORY_FIELD_ORDER = ['name', 'shortLabel', 'slug', 'description', 'blogs'];
const NOT_SHOWN = 'Not shown on the website at the moment.';

/** Page-record components whose schema attribute order already follows their page top to bottom: their stored
 * edit layout is rebuilt in that order (Strapi otherwise appends newly added fields at the bottom of the form). */
const PAGE_COMPONENTS = ['page-content.contact', 'page-content.work-with-us', 'page-content.our-company', 'page-content.blog', 'page-content.gallery'];

async function reorderComponent(strapi: any, uid: string, descriptions: Record<string, string> = {}) {
  const componentsService = strapi.plugin('content-manager').service('components');
  const component = strapi.components[uid];
  const current = await componentsService.findConfiguration(component);
  const fieldOrder = Object.keys(component.attributes).filter((n) => !['id', 'documentId'].includes(n));
  const fieldSizes = strapi.plugin('content-manager').service('field-sizes');
  const existing = new Map<string, number>();
  for (const row of current.layouts?.edit ?? []) for (const el of row) existing.set(el.name, el.size);
  const edit = fieldOrder.map((name) => [{ name, size: existing.get(name) ?? fieldSizes.getFieldSize(component.attributes[name].type).default }]);
  const metadatas = { ...(current.metadatas ?? {}) };
  for (const [name, description] of Object.entries(descriptions)) {
    const meta = metadatas[name] ?? {};
    metadatas[name] = { ...meta, edit: { ...(meta.edit ?? {}), description } };
  }
  await componentsService.updateConfiguration(component, { ...(Object.keys(descriptions).length ? { metadatas } : {}), layouts: { edit, list: current.layouts?.list ?? [] } });
  strapi.log.info(`[reorder] ${uid}: component edit layout follows its schema order (${edit.length} fields).`);
}

async function main() {
  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();
  strapi.log.level = 'error';

  // `-- --only=service` (comma-separated: industry, service, global, testimonial, blog, components, chat, case-study,
  // team-member, gallery-item, category) limits the run.
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()) : null;
  const run = (key: string) => !only || only.includes(key);

  try {
    if (run('industry')) {
      await reorderContentType(strapi, INDUSTRY_UID, INDUSTRY_FIELD_ORDER, {
        sections: 'Each page section is a collapsible block. Click a block to expand it, drag to reorder, and use its Show section toggle to hide it without deleting the content.',
      });
    }
    if (run('components')) {
      for (const uid of PAGE_COMPONENTS) await reorderComponent(strapi, uid);
      await reorderComponent(strapi, 'shared.nav-item', {
        menuType: 'Services mega-menu / Industries mega-menu open the big menus (their content is set further down this page); link = a plain link; dropdown = the child links below.',
        page: 'Pick a Page instead of typing a URL; its address follows the page if the slug changes.',
        isVisible: 'Off hides the item from the header without deleting it.',
      });
    }
    if (run('chat')) {
      const ONE_PER_LINE = 'One per line.';
      await reorderComponent(strapi, 'shared.chat-widget', {
        quickActions: 'The pills under the chat. "Lead form" pills open the callback form straight away.',
        keywordReplies: 'Answers to typed messages, checked top to bottom (first match wins). Empty = the built-in answers.',
        acknowledgement: 'Reply when a typed message matches no keyword. A "Request callback" button is added under it.',
        formButtonLabel: 'The always-visible button under the chat header that opens the callback form.',
        proposalButtonLabel: 'Button under answer cards that opens the callback form (e.g. "Request Proposal →").',
        formIntro: 'Shown above the callback form.',
        serviceOptions: `Choices in the form's "Service / research area" dropdown. ${ONE_PER_LINE}`,
        formSuccess: 'Shown after the form is sent. {name} = the visitor\'s first name, {contact} = their phone and email.',
      });
      await reorderComponent(strapi, 'shared.chat-quick-action', {
        action: 'reply = answer with the card below; lead_form = show the reply text, then open the callback form.',
        highlights: `Bullet points under the reply. ${ONE_PER_LINE}`,
        stats: `Small figure chips, e.g. "90+ Countries". ${ONE_PER_LINE}`,
        linkHref: 'A site path such as /services, or a full URL.',
        showFormButton: 'Adds the proposal button under the card.',
      });
      await reorderComponent(strapi, 'shared.chat-keyword-reply', {
        keywords: 'Comma-separated words or phrases, e.g. "cati, telephonic, phone survey". A word also matches longer forms (career → careers).',
        highlights: `Bullet points under the reply. ${ONE_PER_LINE}`,
        linkHref: 'A site path such as /services, or a full URL.',
        opensForm: 'Also open the callback form (use for quote / pricing / callback questions).',
      });
    }
    if (run('case-study')) await reorderContentType(strapi, CASE_STUDY_UID, CASE_STUDY_FIELD_ORDER);
    if (run('team-member')) await reorderContentType(strapi, TEAM_MEMBER_UID, TEAM_MEMBER_FIELD_ORDER, { order: 'Sort order on /our-team (lower first).' });
    if (run('gallery-item')) await reorderContentType(strapi, GALLERY_ITEM_UID, GALLERY_ITEM_FIELD_ORDER, { caption: NOT_SHOWN, order: 'Sort order on /gallery (lower first).' });
    if (run('category')) await reorderContentType(strapi, CATEGORY_UID, CATEGORY_FIELD_ORDER, { description: NOT_SHOWN });
    if (run('service')) {
      await reorderContentType(strapi, SERVICE_UID, SERVICE_FIELD_ORDER, {
        ...Object.fromEntries(SERVICE_LEVEL2_ONLY.map((f) => [f, LEVEL2_NOTE])),
        listingDescription: 'Services listing panel text (top-level categories only). Empty = the summary.',
        listingIcon: 'Services listing panel icon (top-level categories only).',
      });
    }
    if (run('global')) await reorderContentType(strapi, GLOBAL_UID, GLOBAL_FIELD_ORDER);
    if (run('testimonial')) await reorderContentType(strapi, TESTIMONIAL_UID, TESTIMONIAL_FIELD_ORDER);
    if (run('blog')) await reorderContentType(strapi, BLOG_UID, BLOG_FIELD_ORDER);
    console.log(`[reorder] Done (${only ? only.join(', ') : 'all content types'}): edit-view layouts match their live-page JSX order.`);
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[reorder] Failed:', err);
  process.exit(1);
});
