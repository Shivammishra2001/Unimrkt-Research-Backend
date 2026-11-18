/**
 * Saves the approved Figma copy and media (node 859:15301) into the "Telephonic Surveys" service entry, so the
 * Level-3 page renders its Figma design from Strapi (the frontend now prefers Strapi content on every sub-service) —
 * hero, stats, overview, process, FAQ and about, plus the Why / Measure / Quality / Technology sections (filled only
 * while empty; see scripts/lib/subservice-sections.ts).
 *
 * Safe and idempotent:
 *   - The copy is written only while the entry still holds the original seeded boilerplate (hero heading
 *     "Real Conversations. Reliable Data. Better Decisions." or empty). Once an editor has changed it — or this seed
 *     has already run — the copy is left alone. `--force` rewrites it anyway.
 *   - The hero / overview photos are uploaded once (reused by filename) and bound only when the field is empty.
 *   - The entry is republished only when something changed.
 *
 * Run once per environment:  npm run seed:telephonic-service   (add -- --force to overwrite edited copy)
 */
import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';
import { sectionData, SECTION_POPULATE, telephonicSections } from './lib/subservice-sections';

const UID = 'api::service.service';
const SLUG = 'telephonic-surveys';
const ASSETS_DIR = path.join(__dirname, 'seed-assets', 'services', 'telephonic-surveys');
const SEEDED_HERO_HEADING = 'Real Conversations. Reliable Data. Better Decisions.';
const FORCE = process.argv.includes('--force');

const COPY = {
  heroEyebrow: 'Telephonic Surveys',
  heroHeading: 'Turn Conversations Into Actionable Insights',
  heroSubheading: 'Reach the right respondents and capture reliable insights through professionally managed telephonic surveys.',
  heroActions: [{ label: 'Get a Free Quote', href: '/contact', isExternal: false, variant: 'primary' }],

  credentialsHeading: 'Research Built Around Every Conversation',
  // iconIdentifier keys map to the Figma pictograms in Frontend/public/icons/services/telephonic-surveys/.
  credentials: [
    { value: '100K+', label: 'CATI Interviews', iconIdentifier: 'stat-interviews' },
    { value: '50+', label: 'Research Markets', iconIdentifier: 'stat-markets' },
    { value: 'Multi-Lingual', label: 'Interview Capabilities', iconIdentifier: 'stat-languages' },
    { value: 'Quality-Controlled', label: 'Every Stage', iconIdentifier: 'stat-quality' },
  ],

  overviewEyebrow: 'What Are Telephonic Surveys?',
  overviewHeading: 'Direct Access to the Voices That Matter',
  overviewBody:
    'Telephonic surveys provide a structured and efficient way to connect directly with respondents and capture their opinions, experiences, preferences and behaviours.\n\n' +
    'At Unimrkt Research, our telephonic research programs combine trained interviewers, carefully designed questionnaires, respondent targeting and rigorous quality checks to deliver dependable primary research insights.\n\n' +
    'Whether you need customer feedback, market intelligence, brand understanding or B2B research, our CATI capabilities help you collect meaningful data at scale.',

  methodologiesEyebrow: 'Our Telephonic Survey Process',
  methodologiesHeading: 'From Research Brief to Reliable Insights',
  methodologies: [
    { title: 'Understand', description: 'We begin by understanding your research goals, target audience, sample needs and key questions.', iconIdentifier: 'process-understand' },
    { title: 'Design', description: 'Our research team structures the questionnaire and interview flow around the study objectives.', iconIdentifier: 'process-design' },
    { title: 'Recruit', description: 'We identify and reach relevant respondents based on the agreed sample criteria.', iconIdentifier: 'process-recruit' },
    { title: 'Interview', description: 'Trained interviewers conduct structured telephonic interviews using CATI-enabled workflows.', iconIdentifier: 'process-interview' },
  ],

  faqItems: [
    { question: 'What are telephonic surveys?', answer: 'Telephonic surveys are structured interviews conducted by phone, where trained interviewers ask respondents a set questionnaire and record their answers — a fast, reliable way to collect first-hand data from a defined audience.' },
    { question: 'What is CATI?', answer: 'CATI (Computer-Assisted Telephone Interviewing) is the technology our interviewers use: the questionnaire runs on screen with routing, quotas and validation built in, so every interview follows the same flow and data is captured cleanly in real time.' },
    { question: 'When should I use a telephonic survey?', answer: 'They work well when you need to reach specific or hard-to-reach audiences, want interviewer-led clarification, need fast turnaround across geographies, or are researching B2B decision-makers who are easier to reach by phone.' },
    { question: 'Can you conduct surveys in multiple languages?', answer: 'Yes. Our interviewers conduct telephonic surveys in 22+ languages across 90+ countries, so respondents can answer in the language they are most comfortable with.' },
    { question: 'Can you reach B2B respondents?', answer: 'Yes. We regularly interview business decision-makers, professionals and specialist audiences, screening every respondent against the agreed criteria before the interview begins.' },
    { question: 'How do you ensure data quality?', answer: 'Through interviewer training, sample validation, live call monitoring, response validation and structured data-quality checks, backed by ISO 20252 and ISO 27001 certified processes.' },
  ],

  aboutEyebrow: 'About Telephonic Surveys',
  aboutHeading: 'Direct Conversations. Deeper Insights.',
  aboutBody:
    'Telephonic Surveys enable businesses to connect directly with their target audience and gather reliable, real-time insights through structured conversations. At Unimrkt Research, our trained interviewers use professionally designed questionnaires and robust research processes to capture meaningful responses from the right respondents.\n\n' +
    'From customer feedback and brand perception to market understanding and B2B research, our telephonic survey solutions combine human interaction with technology-driven data collection to deliver accurate, actionable insights that support confident business decisions.',
};

const IMAGES: Array<{ field: 'heroImage' | 'overviewImage'; file: string; alt: string }> = [
  { field: 'heroImage', file: 'telephonic-surveys-hero.webp', alt: 'Researcher conducting a telephonic survey' },
  { field: 'overviewImage', file: 'telephonic-surveys-intro.webp', alt: 'Telephonic survey interviewer' },
];

async function uploadAsset(strapi: any, filename: string, alt: string): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.warn(`[telephonic-service] missing asset ${filePath}`);
    return null;
  }
  const mime = 'image/webp';
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: { fileInfo: { alternativeText: alt, name: filename } },
    files: { path: filePath, filepath: filePath, name: filename, originalFilename: filename, type: mime, mimetype: mime, size: fs.statSync(filePath).size },
  });
  return uploaded?.id ?? null;
}

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  try {
    const entry = await strapi.documents(UID).findFirst({ filters: { slug: SLUG }, status: 'draft', populate: ['heroImage', 'overviewImage', ...SECTION_POPULATE] });
    if (!entry) {
      // eslint-disable-next-line no-console
      console.log(`[telephonic-service] no "${SLUG}" service entry — nothing to do`);
      return;
    }

    const data: Record<string, unknown> = {};
    const heading = String(entry.heroHeading ?? '').trim();
    if (FORCE || heading === '' || heading === SEEDED_HERO_HEADING) {
      Object.assign(data, COPY);
      // eslint-disable-next-line no-console
      console.log(`[telephonic-service] writing Figma copy${FORCE ? ' (--force)' : ''}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[telephonic-service] hero/stats/overview/process/FAQ/about copy already set ("${heading}") — left unchanged (use --force to overwrite)`);
    }

    // Why / What We Can Measure / Quality First / Technology panels — each written only while it is still empty.
    const sections = await sectionData(strapi, entry, telephonicSections());
    Object.assign(data, sections.data);
    if (sections.written.length) {
      // eslint-disable-next-line no-console
      console.log(`[telephonic-service] sections filled: ${sections.written.join(', ')}`);
    }

    for (const img of IMAGES) {
      if (entry[img.field]) continue;
      const id = await uploadAsset(strapi, img.file, img.alt);
      if (id) {
        data[img.field] = id;
        // eslint-disable-next-line no-console
        console.log(`[telephonic-service] ${img.field} <- ${img.file}`);
      }
    }

    if (Object.keys(data).length === 0) {
      // eslint-disable-next-line no-console
      console.log('[telephonic-service] nothing changed');
      return;
    }
    await strapi.documents(UID).update({ documentId: entry.documentId, data });
    await strapi.documents(UID).publish({ documentId: entry.documentId });
    // eslint-disable-next-line no-console
    console.log('[telephonic-service] saved and published');
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error('[telephonic-service] failed:', err);
    process.exit(1);
  },
);
