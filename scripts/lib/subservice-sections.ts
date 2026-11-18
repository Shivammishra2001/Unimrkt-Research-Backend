/**
 * Shared data + helpers for the four Level-3 sub-service sections added to api::service.service
 * (Figma 859:15301): Why, What We Can Measure, Quality First and the Technology panels.
 *
 *   - telephonicSections(): the approved Figma copy (telephonic-surveys).
 *   - genericSections(title): the same structure with the service title worked in — identical to the frontend's
 *     fallback copy, so seeding changes nothing visible; it just makes the copy editable in the admin.
 *   - sectionData(): builds the update payload, writing a section ONLY while all of its fields are still empty, so an
 *     editor's work is never overwritten.
 *
 * iconIdentifier keys (why-*, quality-*) name the Figma pictograms in Frontend/public/icons/services/telephonic-surveys/.
 * Photos are uploaded once (reused by filename) from scripts/seed-assets/services/subservice/.
 */
import path from 'path';
import fs from 'fs';

const ASSETS_DIR = path.join(__dirname, '..', 'seed-assets', 'services', 'subservice');

interface Card {
  title: string;
  description: string;
  iconIdentifier?: string;
  imageFile?: string;
}

export interface SectionCopy {
  why: { eyebrow: string; heading: string; items: Card[] };
  measure: { eyebrow: string; heading: string; body: string; items: Card[] };
  quality: { eyebrow: string; heading: string; body: string; imageFile: string; items: Card[] };
  tech: { eyebrow: string; heading: string; body: string; items: Card[] };
}

const WHY_KEYS = ['why-reach', 'why-speed', 'why-human', 'why-language', 'why-engagement', 'why-scalable'];
const QUALITY_KEYS = ['quality-training', 'quality-sample', 'quality-monitoring', 'quality-responses', 'quality-checks', 'quality-security'];
const withKeys = (items: Array<[string, string]>, keys: string[]): Card[] => items.map(([title, description], i) => ({ title, description, iconIdentifier: keys[i] }));

const MEASURE: Card[] = [
  { title: 'Customer Experience', description: 'Measure satisfaction, pain points, expectations and service experiences.', imageFile: 'subservice-measure-customer-experience.webp' },
  { title: 'Brand Research', description: 'Understand awareness, consideration, perception and brand associations.', imageFile: 'subservice-measure-brand-research.webp' },
  { title: 'Market Research', description: 'Explore market dynamics, preferences, behaviours and purchase drivers.', imageFile: 'subservice-measure-market-research.webp' },
  { title: 'Product Research', description: 'Test concepts, features, pricing and product experiences with the right users.', imageFile: 'subservice-measure-product-research.webp' },
  { title: 'B2B Research', description: 'Reach decision-makers and professionals to understand business needs and buying journeys.', imageFile: 'subservice-measure-b2b-research.webp' },
  { title: 'Employee Research', description: 'Capture engagement, culture and workplace experience across your organisation.', imageFile: 'subservice-measure-employee-research.webp' },
];

const TECH: Card[] = [
  { title: 'Smart Survey Management', description: 'Structured questionnaires and controlled interview flows.', imageFile: 'subservice-cati-smart-survey-management.webp' },
  { title: 'Real-Time Monitoring', description: 'Track fieldwork progress and sample performance.', imageFile: 'subservice-cati-real-time-monitoring.webp' },
  { title: 'Interview Controls', description: 'Maintain consistency across interviews and respondents.', imageFile: 'subservice-cati-interview-controls.webp' },
  { title: 'Data Validation', description: 'Built-in checks help identify incomplete or inconsistent responses.', imageFile: 'subservice-cati-data-validation.webp' },
  { title: 'Centralized Data', description: 'Every response captured in one secure, centrally managed system.', imageFile: 'subservice-cati-centralized-data.webp' },
];

export function telephonicSections(): SectionCopy {
  return {
    why: {
      eyebrow: 'Why Telephonic Surveys?',
      heading: 'When the Right Questions Need a Real Conversation',
      items: withKeys(
        [
          ['Wider Respondent Reach', 'Connect with respondents across geographies, demographics and hard-to-reach segments.'],
          ['Faster Data Collection', 'Collect structured feedback efficiently without the logistical complexity of face-to-face fieldwork.'],
          ['Human Interaction', 'Interviewers can clarify questions, manage responses and maintain a natural flow throughout the conversation.'],
          ['Multi-Language Capability', 'Conduct interviews in languages respondents are most comfortable speaking.'],
          ['Better Respondent Engagement', 'Personal interaction can help improve participation and response quality for suitable research audiences.'],
          ['Scalable Research', 'Scale interviews up or down according to sample size, geography and research objectives.'],
        ],
        WHY_KEYS,
      ),
    },
    measure: {
      eyebrow: 'What We Can Measure',
      heading: 'Ask. Listen. Understand.',
      body: 'From brand perception to customer experience, our telephonic surveys help uncover the answers behind the numbers.',
      items: MEASURE,
    },
    quality: {
      eyebrow: 'Quality First',
      heading: 'Every Conversation Counts. Every Response Matters.',
      body: 'Reliable research starts with reliable data. Our quality framework is designed to maintain accuracy, consistency and respondent authenticity throughout the telephonic research process.',
      imageFile: 'subservice-quality-bg.webp',
      items: withKeys(
        [
          ['Interviewer Training', 'Interviewers are trained on research goals and questionnaire flow.'],
          ['Sample Validation', 'Respondents are screened against agreed research criteria.'],
          ['Call Monitoring', 'Fieldwork is monitored to maintain interviewing standards.'],
          ['Response Validation', 'Responses are reviewed for completeness and consistency.'],
          ['Data Quality Checks', 'Structured checks identify anomalies and quality issues.'],
          ['Secure Data Handling', 'Research data is securely managed to protect respondent privacy.'],
        ],
        QUALITY_KEYS,
      ),
    },
    tech: {
      eyebrow: 'CATI Technology',
      heading: 'Human Conversations.\nTechnology-Enabled Research.',
      body: 'CATI combines interviewer-led conversations with technology for consistent, efficient research management.',
      items: TECH,
    },
  };
}

export function genericSections(title: string): SectionCopy {
  const tl = title.toLowerCase();
  return {
    why: {
      eyebrow: `Why ${title}?`,
      heading: 'The Right Method for the Right Questions',
      items: withKeys(
        [
          ['Wider Respondent Reach', 'Connect with respondents across geographies, demographics and hard-to-reach segments.'],
          ['Faster Data Collection', 'Collect structured feedback efficiently and keep fieldwork on schedule.'],
          ['Expert Research Team', 'Experienced researchers manage every stage, from design to delivery.'],
          ['Multi-Language Capability', 'Run research in the languages respondents are most comfortable with.'],
          ['Better Respondent Engagement', 'Well-designed research experiences improve participation and response quality.'],
          ['Scalable Research', 'Scale up or down according to sample size, geography and research objectives.'],
        ],
        WHY_KEYS,
      ),
    },
    measure: {
      eyebrow: 'What We Can Measure',
      heading: 'Ask. Listen. Understand.',
      body: `From brand perception to customer experience, our ${tl} help uncover the answers behind the numbers.`,
      items: MEASURE,
    },
    quality: {
      eyebrow: 'Quality First',
      heading: 'Every Response Counts. Every Insight Matters.',
      body: `Reliable research starts with reliable data. Our quality framework is designed to maintain accuracy, consistency and respondent authenticity throughout every ${tl} project.`,
      imageFile: 'subservice-quality-bg.webp',
      items: withKeys(
        [
          ['Researcher Training', 'Teams are trained on research goals and the study flow.'],
          ['Sample Validation', 'Respondents are screened against agreed research criteria.'],
          ['Fieldwork Monitoring', 'Fieldwork is monitored to maintain research standards.'],
          ['Response Validation', 'Responses are reviewed for completeness and consistency.'],
          ['Data Quality Checks', 'Structured checks identify anomalies and quality issues.'],
          ['Secure Data Handling', 'Research data is securely managed to protect respondent privacy.'],
        ],
        QUALITY_KEYS,
      ),
    },
    tech: {
      eyebrow: 'Research Technology',
      heading: 'Expert Researchers.\nTechnology-Enabled Research.',
      body: 'Our research platforms combine expert-led fieldwork with technology for consistent, efficient research management.',
      items: TECH,
    },
  };
}

export async function uploadWebp(strapi: any, filename: string, alt = ''): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.warn(`[subservice-sections] missing asset ${filePath}`);
    return null;
  }
  const mime = 'image/webp';
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: { fileInfo: { alternativeText: alt, name: filename } },
    files: { path: filePath, filepath: filePath, name: filename, originalFilename: filename, type: mime, mimetype: mime, size: fs.statSync(filePath).size },
  });
  return uploaded?.id ?? null;
}

const blank = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

async function cards(strapi: any, items: Card[]) {
  const out = [];
  for (const c of items) {
    const image = c.imageFile ? await uploadWebp(strapi, c.imageFile, c.title) : null;
    out.push({ title: c.title, description: c.description, ...(c.iconIdentifier ? { iconIdentifier: c.iconIdentifier } : {}), ...(image ? { image } : {}) });
  }
  return out;
}

/** Update payload for the sections that are still completely empty on `entry` (populated draft); `written` names them. */
export async function sectionData(strapi: any, entry: any, copy: SectionCopy): Promise<{ data: Record<string, unknown>; written: string[] }> {
  const data: Record<string, unknown> = {};
  const written: string[] = [];

  if ([entry.whyEyebrow, entry.whyHeading, entry.whyBody, entry.whyItems].every(blank)) {
    Object.assign(data, { whyEyebrow: copy.why.eyebrow, whyHeading: copy.why.heading, whyItems: await cards(strapi, copy.why.items) });
    written.push('why');
  }
  if ([entry.measureEyebrow, entry.measureHeading, entry.measureBody, entry.measureItems].every(blank)) {
    Object.assign(data, { measureEyebrow: copy.measure.eyebrow, measureHeading: copy.measure.heading, measureBody: copy.measure.body, measureItems: await cards(strapi, copy.measure.items) });
    written.push('measure');
  }
  if ([entry.qualityEyebrow, entry.qualityHeading, entry.qualityBody, entry.qualityItems].every(blank)) {
    Object.assign(data, { qualityEyebrow: copy.quality.eyebrow, qualityHeading: copy.quality.heading, qualityBody: copy.quality.body, qualityItems: await cards(strapi, copy.quality.items) });
    written.push('quality');
  }
  if (!entry.qualityImage) {
    const id = await uploadWebp(strapi, copy.quality.imageFile, '');
    if (id) {
      data.qualityImage = id;
      written.push('qualityImage');
    }
  }
  if ([entry.techEyebrow, entry.techHeading, entry.techBody, entry.techPanels].every(blank)) {
    Object.assign(data, { techEyebrow: copy.tech.eyebrow, techHeading: copy.tech.heading, techBody: copy.tech.body, techPanels: await cards(strapi, copy.tech.items) });
    written.push('tech');
  }
  return { data, written };
}

/** Populate needed to judge emptiness. */
export const SECTION_POPULATE = ['whyItems', 'measureItems', 'qualityItems', 'qualityImage', 'techPanels'];
