/**
 * One-time script: reorders the Strapi Admin Content-Manager **edit
 * view** field layout for `api::industry.industry` and
 * `api::service.service` so it matches — field for field, top to
 * bottom — the exact order those fields are rendered on the live
 * frontend page.
 *
 * Why this is needed: Strapi auto-generates/merges the admin edit-view
 * layout by APPENDING newly-added schema attributes to the end of
 * whatever layout is already stored in the core-store, in whatever
 * order they were added to schema.json over time (see
 * `@strapi/content-manager`'s `syncLayouts()` /
 * `appendToEditLayout()`). Both these content types had their ~35-50
 * detail-page fields added incrementally across several separate
 * schema edits this project went through, so the persisted admin
 * layout order does NOT reliably match either the final schema.json
 * attribute order or (for services especially) the JSX render order —
 * e.g. `features` was added to the schema early (before any hero/detail
 * fields existed) but is rendered 4th on the page (inside the
 * Capabilities section), so an editor scrolling the admin form today
 * would hit it in the wrong place.
 *
 * The field order below is NOT invented — it was extracted by reading
 * the two view files' JSX return statements top to bottom and noting
 * exactly which Strapi field(s) each rendered component consumes:
 *   - Frontend/views/industries/IndustryDetailView.tsx
 *   - Frontend/views/services/ServiceDetailView.tsx
 * Fields that exist on the model but are NOT rendered by the detail
 * page itself (title/slug/summary/seo/thumbnail/basePrice/parent/
 * children/legacyUrl/suggestedUrl/icon — used by the listing pages,
 * breadcrumbs, and SEO tags instead) keep their original schema.json
 * relative order and are grouped at the top, ahead of the Hero section,
 * since the JSX gives no ordering signal for them.
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
    console.log('[reorder] Done. Both content types now match their live-page JSX order in the admin edit view.');
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[reorder] Failed:', err);
  process.exit(1);
});
