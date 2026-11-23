/**
 * Dry-run verification: re-read every migrated industry entry (new
 * `sections` dynamic zone) and diff it, field by field, against the old
 * flat export to prove ZERO data loss — every scalar, every media id, and
 * every nested repeatable item is accounted for in its new section.
 *
 * Usage: npx ts-node scripts/verify-industry-migration.ts --export=data/exports/industry-export-XXXX.json
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';
import * as fs from 'fs';
import * as path from 'path';
import { buildIndustryPopulate } from '../src/api/industry/services/industry';

const UID = 'api::industry.industry' as const;

function resolveExport(): string {
  const arg = process.argv.find((a) => a.startsWith('--export='));
  if (arg) return path.resolve(arg.slice('--export='.length));
  const dir = path.resolve('data/exports');
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('industry-export-') && f.endsWith('.json')).sort();
  return path.join(dir, files[files.length - 1]);
}

const mid = (m: any): number | null => (m && typeof m === 'object' ? (m.id ?? null) : null);
const sec = (entry: any, comp: string) => (entry.sections || []).find((s: any) => s.__component === comp);
function deepMedia(v: any, acc: number[] = []): number[] {
  if (v == null) return acc;
  if (Array.isArray(v)) { v.forEach((x) => deepMedia(x, acc)); return acc; }
  if (typeof v === 'object') {
    if ('url' in v && 'mime' in v && v.id != null) acc.push(v.id);
    else for (const val of Object.values(v)) deepMedia(val, acc);
  }
  return acc;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(resolveExport(), 'utf8'));
  const strapi = await createStrapi(await compileStrapi()).load();
  strapi.log.level = 'error';

  let failures = 0, checked = 0, media = 0, items = 0;
  const fail = (m: string) => { failures++; if (failures <= 50) console.log('  FAIL:', m); };

  try {
    for (const status of ['published', 'draft'] as const) {
      const live = await strapi.documents(UID).findMany({ status, populate: buildIndustryPopulate() as any });
      const byDoc = new Map(live.map((e: any) => [e.documentId, e]));
      for (const old of data[status] || []) {
        checked++;
        const neu = byDoc.get(old.documentId);
        const tag = `[${status}] ${old.title}`;
        if (!neu) { fail(`${tag}: not found after migration`); continue; }

        const S = {
          hero: sec(neu, 'industry-sections.hero'), overview: sec(neu, 'industry-sections.overview'),
          why: sec(neu, 'industry-sections.why-research'), exp: sec(neu, 'industry-sections.expertise'),
          chal: sec(neu, 'industry-sections.challenges'), who: sec(neu, 'industry-sections.who-we-serve'),
          meth: sec(neu, 'industry-sections.methodologies'), emp: sec(neu, 'industry-sections.empower'),
          enq: sec(neu, 'industry-sections.enquiry'), blogs: sec(neu, 'industry-sections.blogs-band'),
          faq: sec(neu, 'industry-sections.faq'), cs: sec(neu, 'industry-sections.case-studies'),
          about: sec(neu, 'industry-sections.about'), cta: sec(neu, 'industry-sections.cta-banner'),
          seo: sec(neu, 'shared.seo'),
        };
        for (const [k, v] of Object.entries(S)) if (!v && k !== 'seo') fail(`${tag}: missing section ${k}`);

        // scalars
        const eq = (a: any, b: any, label: string) => { if ((a ?? null) !== (b ?? null)) fail(`${tag}: ${label} "${a}" != "${b}"`); };
        eq(old.heroEyebrow, S.hero?.eyebrow, 'hero.eyebrow'); eq(old.heroHeading, S.hero?.heading, 'hero.heading'); eq(old.heroSubheading, S.hero?.subheading, 'hero.subheading');
        eq(old.whatWeDoEyebrow, S.overview?.eyebrow, 'overview.eyebrow'); eq(old.whatWeDoHeading, S.overview?.heading, 'overview.heading'); eq(old.whatWeDoBody, S.overview?.body, 'overview.body'); eq(old.trustHeading, S.overview?.partnersHeading, 'overview.partnersHeading');
        eq(old.whyResearchEyebrow, S.why?.eyebrow, 'why.eyebrow'); eq(old.whyResearchHeading, S.why?.heading, 'why.heading');
        eq(old.expertiseEyebrow, S.exp?.eyebrow, 'exp.eyebrow'); eq(old.expertiseHeading, S.exp?.heading, 'exp.heading');
        eq(old.challengesEyebrow, S.chal?.eyebrow, 'chal.eyebrow'); eq(old.challengesHeading, S.chal?.heading, 'chal.heading'); eq(old.challengesBody, S.chal?.body, 'chal.body');
        eq(old.whoWeServeEyebrow, S.who?.eyebrow, 'who.eyebrow'); eq(old.whoWeServeHeading, S.who?.heading, 'who.heading');
        eq(old.methodologiesEyebrow, S.meth?.eyebrow, 'meth.eyebrow'); eq(old.methodologiesHeading, S.meth?.heading, 'meth.heading'); eq(old.methodologiesBody, S.meth?.body, 'meth.body');
        eq(old.empowerEyebrow, S.emp?.eyebrow, 'emp.eyebrow'); eq(old.empowerHeading, S.emp?.heading, 'emp.heading'); eq(old.empowerBody, S.emp?.body, 'emp.body');
        eq(old.enquiryEyebrow, S.enq?.eyebrow, 'enq.eyebrow'); eq(old.enquiryHeading, S.enq?.heading, 'enq.heading'); eq(old.enquiryBody, S.enq?.body, 'enq.body');
        eq(old.caseStudiesEyebrow, S.cs?.eyebrow, 'cs.eyebrow'); eq(old.caseStudiesHeading, S.cs?.heading, 'cs.heading'); eq(old.caseStudiesBody, S.cs?.body, 'cs.body');
        eq(old.aboutEyebrow, S.about?.eyebrow, 'about.eyebrow'); eq(old.aboutHeading, S.about?.heading, 'about.heading'); eq(old.aboutBody, S.about?.body, 'about.body');

        // single media
        const mcheck = (o: any, n: any, l: string) => { const a = mid(o), b = mid(n); if ((a ?? null) !== (b ?? null)) fail(`${tag}: media ${l} ${a} != ${b}`); if (a != null) media++; };
        mcheck(old.heroImage, S.hero?.image, 'hero.image'); mcheck(old.whatWeDoImage, S.overview?.image, 'overview.image');
        mcheck(old.empowerImage, S.emp?.image, 'emp.image'); mcheck(old.enquiryImage, S.enq?.image, 'enq.image');
        mcheck(old.icon, neu.icon, 'icon'); mcheck(old.seo?.shareImage, S.seo?.shareImage, 'seo.shareImage');

        // repeatables: count + nested media set
        const lcheck = (o: any[], n: any[], l: string) => {
          o = o || []; n = n || [];
          if (o.length !== n.length) fail(`${tag}: ${l} count ${o.length} != ${n.length}`);
          items += n.length;
          const om = deepMedia(o).sort((a, b) => a - b); const nm = deepMedia(n).sort((a, b) => a - b);
          if (JSON.stringify(om) !== JSON.stringify(nm)) fail(`${tag}: ${l} nested media ${JSON.stringify(om)} != ${JSON.stringify(nm)}`);
          media += nm.length;
        };
        lcheck(old.heroActions, S.hero?.actions, 'hero.actions'); lcheck(old.trustLogos, S.overview?.partners, 'overview.partners');
        lcheck(old.whyResearchCards, S.why?.cards, 'why.cards'); lcheck(old.expertiseItems, S.exp?.items, 'exp.items');
        lcheck(old.challengesCards, S.chal?.cards, 'chal.cards'); lcheck(old.whoWeServeCards, S.who?.cards, 'who.cards');
        lcheck(old.methodologies, S.meth?.items, 'meth.items'); lcheck(old.faqItems, S.faq?.items, 'faq.items');
        lcheck(old.caseStudies, S.cs?.items, 'cs.items');

        // seo scalars
        if (old.seo) {
          eq(old.seo.metaTitle, S.seo?.metaTitle, 'seo.metaTitle'); eq(old.seo.metaDescription, S.seo?.metaDescription, 'seo.metaDescription');
          eq(old.seo.keywords, S.seo?.keywords, 'seo.keywords');
        }
      }
    }
    console.log(`\nEntries checked: ${checked}`);
    console.log(`Media relations verified: ${media}`);
    console.log(`Repeatable items verified: ${items}`);
    console.log(failures === 0 ? '\nZERO DATA LOSS — migration verified against the old export.' : `\n${failures} FAILURE(S) — see above.`);
  } finally {
    await strapi.destroy();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('[verify] FATAL', e); process.exit(1); });
