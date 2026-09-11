/**
 * One-time script: reorders the Strapi Admin Content-Manager **edit
 * view** field layout for every content type that has a fixed,
 * page-shaped set of named fields, so it matches — field for field, top
 * to bottom — the exact order those fields are rendered on the live
 * frontend page:
 *   - api::industry.industry   (/industries/[slug])
 *   - api::service.service     (/services/[slug])
 *   - api::services-page.services-page  (/services listing)
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
const SERVICES_PAGE_UID = 'api::services-page.services-page';
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

// Order = exact top-to-bottom JSX render sequence of
// Frontend/views/industries/IndustryDetailView.tsx.
const INDUSTRY_FIELD_ORDER = [
  // --- not rendered by the detail JSX; identity/SEO fields, original schema order ---
  'title',
  'slug',
  'legacyUrl',
  'suggestedUrl',
  'summary',
  'icon',
  'seo',
  // --- <DetailHero> ---
  'heroEyebrow',
  'heroHeading',
  'heroSubheading',
  'heroImage',
  'heroActions',
  // --- <TrustStrip> ---
  'trustHeading',
  'trustLogos',
  // --- <ContentBlock> ("What We Do") ---
  'whatWeDoEyebrow',
  'whatWeDoHeading',
  'whatWeDoBody',
  'whatWeDoCta',
  'whatWeDoImage',
  // --- <WhyResearchSection> ---
  'whyResearchEyebrow',
  'whyResearchHeading',
  'whyResearchCards',
  // --- <ExpertiseStrip> ---
  'expertiseEyebrow',
  'expertiseHeading',
  'expertiseItems',
  // --- <ChallengesSection> ---
  'challengesEyebrow',
  'challengesHeading',
  'challengesBody',
  'challengesCards',
  // --- <WhoWeServeSection> ---
  'whoWeServeEyebrow',
  'whoWeServeHeading',
  'whoWeServeCards',
  // --- <MethodologiesSection> ---
  'methodologiesEyebrow',
  'methodologiesHeading',
  'methodologiesBody',
  'methodologies',
  // --- <ContentBlock> ("Empower") ---
  'empowerEyebrow',
  'empowerHeading',
  'empowerBody',
  'empowerCta',
  'empowerImage',
  // --- <EnquiryForm> ---
  'enquiryEyebrow',
  'enquiryHeading',
  'enquiryBody',
  'enquiryImage',
  // --- <BlogFaqAccordion> ---
  'faqItems',
  // --- <CaseStudiesSection> ---
  'caseStudiesEyebrow',
  'caseStudiesHeading',
  'caseStudiesBody',
  'caseStudiesCta',
  'caseStudies',
  // --- <AboutIndustrySection> ---
  'aboutEyebrow',
  'aboutHeading',
  'aboutBody',
];

// Order = exact top-to-bottom JSX render sequence of
// Frontend/views/services/ServiceDetailView.tsx.
const SERVICE_FIELD_ORDER = [
  // --- not rendered by the detail JSX; identity/meta/relational fields, original schema order ---
  'title',
  'slug',
  'summary',
  'thumbnail',
  'basePrice',
  'seo',
  'parent',
  'children',
  'legacyUrl',
  'suggestedUrl',
  // --- <ServiceDetailHero> ---
  'heroEyebrow',
  'heroHeading',
  'heroSubheading',
  'heroImage',
  'heroActions',
  // --- <TrustStrip> ---
  'trustHeading',
  'trustLogos',
  // --- <OverviewSection> ---
  'overviewEyebrow',
  'overviewHeading',
  'overviewBody',
  'overviewImage',
  'overviewFeatures',
  // --- <CapabilitiesSection> (reuses the `features` field — see CapabilitiesSection.tsx's header comment) ---
  'capabilitiesEyebrow',
  'capabilitiesHeading',
  'capabilitiesBody',
  'features',
  // --- <CredentialsSection> ---
  'credentialsHeading',
  'credentialsBody',
  'credentials',
  // --- <MethodologiesSection> ---
  'methodologiesEyebrow',
  'methodologiesHeading',
  'methodologies',
  // --- <IndustriesServedSection> ---
  'industriesEyebrow',
  'industriesHeading',
  'industriesBody',
  'industriesServed',
  // --- <EnquiryForm> ---
  'enquiryEyebrow',
  'enquiryHeading',
  'enquiryBody',
  'enquiryImage',
  // --- <BlogFaqAccordion> ---
  'faqItems',
  // --- <AboutSection> ---
  'aboutEyebrow',
  'aboutHeading',
  'aboutBody',
];

// Order = exact top-to-bottom JSX render sequence of
// Frontend/views/services/ServiceListingView.tsx. The category grid
// itself is sourced from the `service` hierarchy, not this singleType,
// so it has no fields here.
const SERVICES_PAGE_FIELD_ORDER = [
  // --- Hero band ---
  'hero',
  // (breadcrumb is static markup, no field)
  // --- Intro heading + category grid header ---
  'introEyebrow',
  'introHeading',
  'introParagraph1',
  'introParagraph2',
  // --- <ResearchProcessSection> (renders right after the grid, BEFORE
  // the value-props band — this was the confirmed mismatch: schema.json
  // had `workflow` declared after `valueProps*`) ---
  'workflow',
  // --- Value proposition / methodology band ---
  'valuePropsHeading',
  'valuePropsBody',
  'valuePropsBackground',
  'valueProps',
  // --- <ServiceFaqAccordion> ---
  'faq',
  // --- Bottom CTA ---
  'cta',
];

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
  // --- Footer (Footer.tsx's own top-to-bottom order: logo already
  // covered above, then tagline, then columns, then socials, then the
  // copyright bar last — this was the confirmed mismatch: schema.json
  // had `footerTagline` declared last, after `defaultSeo`) ---
  'footerTagline',
  'footerColumns',
  'socialLinks',
  'copyright',
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

async function reorderContentType(strapi: any, uid: string, fieldOrder: string[]) {
  const contentTypesService = strapi.plugin('content-manager').service('content-types');
  const current = await contentTypesService.findConfiguration({ uid });
  const newEdit = buildEditLayout(strapi, uid, fieldOrder, current.layouts?.edit ?? []);

  await contentTypesService.updateConfiguration(
    { uid },
    {
      layouts: {
        edit: newEdit,
        list: current.layouts?.list ?? [],
      },
    }
  );

  strapi.log.info(`[reorder] ${uid}: edit-view layout rewritten to ${newEdit.length} fields in JSX order.`);
}

async function main() {
  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();
  strapi.log.level = 'error';

  try {
    await reorderContentType(strapi, INDUSTRY_UID, INDUSTRY_FIELD_ORDER);
    await reorderContentType(strapi, SERVICE_UID, SERVICE_FIELD_ORDER);
    await reorderContentType(strapi, SERVICES_PAGE_UID, SERVICES_PAGE_FIELD_ORDER);
    await reorderContentType(strapi, GLOBAL_UID, GLOBAL_FIELD_ORDER);
    await reorderContentType(strapi, TESTIMONIAL_UID, TESTIMONIAL_FIELD_ORDER);
    await reorderContentType(strapi, BLOG_UID, BLOG_FIELD_ORDER);
    console.log('[reorder] Done. All six content types now match their live-page JSX order in the admin edit view.');
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[reorder] Failed:', err);
  process.exit(1);
});
