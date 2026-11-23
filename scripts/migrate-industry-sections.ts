/**
 * Idempotent migration: old flat `api::industry.industry` fields ->
 * the new `sections` dynamic zone (one ordered block per page section).
 *
 * WHY it reads from a JSON export, not the DB: once the new (sections)
 * schema boots, Strapi drops the old flat columns, so the pre-migration
 * values live only in the timestamped export written by
 * `export-industry-data` (or the inline export in DEPLOYMENT). This script
 * maps that export into the dynamic zone and writes it back via the
 * Document Service, re-publishing entries that were published.
 *
 * Idempotent: re-running simply rewrites each entry's `sections` to the
 * same end state (safe to run more than once).
 *
 * Usage:
 *   npx ts-node scripts/migrate-industry-sections.ts --export=data/exports/industry-export-XXXX.json
 *   (omit --export to use the most recent file in data/exports)
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';
import * as fs from 'fs';
import * as path from 'path';

const UID = 'api::industry.industry' as const;

function resolveExport(): string {
  const arg = process.argv.find((a) => a.startsWith('--export='));
  if (arg) return path.resolve(arg.slice('--export='.length));
  const dir = path.resolve('data/exports');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('industry-export-') && f.endsWith('.json'))
    .sort();
  if (!files.length) throw new Error('No industry-export-*.json in data/exports — run the export first.');
  return path.join(dir, files[files.length - 1]);
}

const mediaId = (m: any): number | null =>
  m && typeof m === 'object' ? (m.id ?? null) : typeof m === 'number' ? m : null;

/** Strip component/entry ids, convert populated media objects to their
 * numeric file id (what the Document Service wants to re-link), recurse. */
function clean(obj: any): any {
  if (obj == null) return null;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id' || k === 'documentId') continue;
    if (v && typeof v === 'object' && 'url' in (v as any) && 'mime' in (v as any)) out[k] = (v as any).id ?? null;
    else if (Array.isArray(v)) out[k] = v.map(clean);
    else if (v && typeof v === 'object') out[k] = clean(v);
    else out[k] = v;
  }
  return out;
}
const list = (arr: any): any[] => (Array.isArray(arr) ? arr.map(clean) : []);
const cmp = (c: any): any => (c ? clean(c) : null);

/** Build the ordered `sections` dynamic zone from one old flat entry.
 * Order = the exact top-to-bottom render order of IndustryDetailView. */
export function buildSections(e: any): any[] {
  const show = (k: string) => (e[k] == null ? true : e[k]); // null/undefined -> visible
  const sections: any[] = [
    { __component: 'industry-sections.hero',
      eyebrow: e.heroEyebrow ?? null, heading: e.heroHeading ?? null, subheading: e.heroSubheading ?? null,
      image: mediaId(e.heroImage), actions: list(e.heroActions) },
    { __component: 'industry-sections.overview', showSection: show('showOverview'),
      eyebrow: e.whatWeDoEyebrow ?? null, heading: e.whatWeDoHeading ?? null, body: e.whatWeDoBody ?? null,
      cta: cmp(e.whatWeDoCta), image: mediaId(e.whatWeDoImage),
      partnersHeading: e.trustHeading ?? null, partners: list(e.trustLogos) },
    { __component: 'industry-sections.why-research', showSection: show('showWhyResearch'),
      eyebrow: e.whyResearchEyebrow ?? null, heading: e.whyResearchHeading ?? null, cards: list(e.whyResearchCards) },
    { __component: 'industry-sections.expertise', showSection: show('showExpertise'),
      eyebrow: e.expertiseEyebrow ?? null, heading: e.expertiseHeading ?? null, items: list(e.expertiseItems) },
    { __component: 'industry-sections.challenges', showSection: show('showChallenges'),
      eyebrow: e.challengesEyebrow ?? null, heading: e.challengesHeading ?? null, body: e.challengesBody ?? null, cards: list(e.challengesCards) },
    { __component: 'industry-sections.who-we-serve', showSection: show('showWhoWeServe'),
      eyebrow: e.whoWeServeEyebrow ?? null, heading: e.whoWeServeHeading ?? null, cards: list(e.whoWeServeCards) },
    { __component: 'industry-sections.methodologies', showSection: show('showMethodologies'),
      eyebrow: e.methodologiesEyebrow ?? null, heading: e.methodologiesHeading ?? null, body: e.methodologiesBody ?? null, items: list(e.methodologies) },
    { __component: 'industry-sections.empower', showSection: show('showEmpower'),
      eyebrow: e.empowerEyebrow ?? null, heading: e.empowerHeading ?? null, body: e.empowerBody ?? null,
      cta: cmp(e.empowerCta), image: mediaId(e.empowerImage) },
    { __component: 'industry-sections.enquiry', showSection: show('showEnquiry'),
      eyebrow: e.enquiryEyebrow ?? null, heading: e.enquiryHeading ?? null, body: e.enquiryBody ?? null, image: mediaId(e.enquiryImage) },
    { __component: 'industry-sections.blogs-band', showSection: show('showBlogs'),
      eyebrow: e.blogBand?.eyebrow ?? null, heading: e.blogBand?.heading ?? null, description: e.blogBand?.description ?? null },
    { __component: 'industry-sections.faq', showSection: show('showFaq'),
      heading: e.faqBand?.heading ?? null, cta: cmp(e.faqBand?.cta), items: list(e.faqItems) },
    { __component: 'industry-sections.case-studies', showSection: show('showCaseStudies'),
      eyebrow: e.caseStudiesEyebrow ?? null, heading: e.caseStudiesHeading ?? null, body: e.caseStudiesBody ?? null,
      cta: cmp(e.caseStudiesCta), items: list(e.caseStudies) },
    { __component: 'industry-sections.about', showSection: show('showAbout'),
      eyebrow: e.aboutEyebrow ?? null, heading: e.aboutHeading ?? null, body: e.aboutBody ?? null },
    { __component: 'industry-sections.cta-banner', showSection: show('showCtaBanner'),
      heading: e.finalCta?.heading ?? null, body: e.finalCta?.body ?? null, action: cmp(e.finalCta?.action) },
  ];
  if (e.seo) sections.push({ __component: 'shared.seo',
    metaTitle: e.seo.metaTitle, metaDescription: e.seo.metaDescription, keywords: e.seo.keywords ?? null,
    preventIndexing: e.seo.preventIndexing ?? false, shareImage: mediaId(e.seo.shareImage) });
  return sections;
}

async function main() {
  const file = resolveExport();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const strapi = await createStrapi(await compileStrapi()).load();
  strapi.log.level = 'error';

  // One record per documentId; prefer published content as the source (draft
  // mirrors it). Track whether a published version existed so we re-publish.
  const byDoc = new Map<string, { published?: any; draft?: any }>();
  for (const e of data.published || []) byDoc.set(e.documentId, { ...(byDoc.get(e.documentId) || {}), published: e });
  for (const e of data.draft || []) byDoc.set(e.documentId, { ...(byDoc.get(e.documentId) || {}), draft: e });

  let migrated = 0;
  let republished = 0;
  try {
    for (const [documentId, rec] of byDoc) {
      const source = rec.published || rec.draft;
      const sections = buildSections(source);
      await strapi.documents(UID).update({ documentId, status: 'draft', data: { sections } as any });
      migrated++;
      if (rec.published) {
        await strapi.documents(UID).publish({ documentId });
        republished++;
      }
    }
    console.log(`[migrate-industry-sections] source: ${path.basename(file)}`);
    console.log(`[migrate-industry-sections] entries migrated (draft): ${migrated}, re-published: ${republished}`);
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  console.error('[migrate-industry-sections] FAILED:', err);
  process.exit(1);
});
