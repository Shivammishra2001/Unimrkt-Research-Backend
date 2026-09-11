/**
 * One-time migration: bakes the frontend's runtime template-fallback
 * copy into Strapi as real, editable CMS content for every industry and
 * service that doesn't have its own authored fields yet.
 *
 * Every string/object below is transcribed VERBATIM from:
 *   - Frontend/views/industries/detail/fallback.ts (resolveIndustryDetail)
 *   - Frontend/views/services/detail/fallback.ts (resolveServiceDetail)
 * — same `${title}`/`${titleLower}` interpolation formulas, same card
 * copy, same FAQ voice, same icon identifiers. Nothing here is authored
 * fresh for this script. The one field intentionally NOT touched is
 * Case Studies — the frontend fallback deliberately has no fallback for
 * it (a "success story" is a claim about a specific completed
 * engagement; fabricating one would misrepresent real client work — see
 * that file's own header comment), so this script doesn't invent one
 * either, and it isn't in the field list below.
 *
 * Only touches entries with no authored content yet (`heroHeading` is
 * still null) — "Automotives" and "Primary Research" are skipped
 * automatically since they already have real fields set.
 *
 * Run once with:  npx ts-node scripts/sync-frontend-fallbacks-to-strapi.ts
 */
import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';

const ASSETS_DIR = path.join(__dirname, 'seed-assets', 'figma');

function mimeTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

/** Identical to seed.ts's uploadAsset() — matched and skipped by
 * filename, so every file here (all already uploaded during the
 * Automotives/Primary Research seed pass) resolves instantly without a
 * re-upload. */
async function uploadAsset(strapi: any, filename: string): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;

  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    strapi.log.warn(`[sync] Asset "${filename}" not found in scripts/seed-assets/figma — skipping upload`);
    return null;
  }

  const stats = fs.statSync(filePath);
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: {},
    files: {
      path: filePath,
      filepath: filePath,
      name: filename,
      originalFilename: filename,
      type: mimeTypeFor(filename),
      mimetype: mimeTypeFor(filename),
      size: stats.size,
    },
  });

  return uploaded?.id ?? null;
}

// ---------------------------------------------------------------------------
// Industries — ported verbatim from Frontend/views/industries/detail/fallback.ts
// ---------------------------------------------------------------------------

const INDUSTRY_FALLBACK_FAQ_ITEMS = [
  {
    question: 'What research methodologies do you use for industry-specific studies?',
    answer:
      'We combine qualitative and quantitative methodologies — in-depth interviews, focus groups, CATI surveys, and online panels — tailored to each industry’s unique data needs.',
  },
  {
    question: 'Is your research approach customized for each industry?',
    answer:
      'Yes — every engagement is designed around the specific regulatory, competitive, and consumer dynamics of that industry rather than a one-size-fits-all template.',
  },
  {
    question: 'How does an industry research engagement typically start?',
    answer:
      'It starts with a scoping conversation to understand your objectives, followed by a tailored methodology proposal — reach out via Talk to Our Experts to begin.',
  },
  {
    question: 'How do you ensure data quality across different industries?',
    answer:
      'Every engagement runs through robust quality control processes, trained interviewers, and industry-experienced analysts to keep findings accurate and reliable.',
  },
  {
    question: 'How can this research help my business?',
    answer:
      'It helps you spot emerging trends earlier, benchmark against research best practices, and make market-entry and strategy decisions with more confidence.',
  },
];

interface IndustryImageIds {
  methodCati: number | null;
  methodOnlineSurveys: number | null;
  methodIdis: number | null;
  methodFgds: number | null;
  contentMechanics: number | null;
  enquiryBg: number | null;
}

/** Mirrors resolveIndustryDetail()'s fallback branch (the `||` right-hand
 * side of every field) exactly — same copy, same interpolation. */
function buildIndustryFallbackPayload(title: string, images: IndustryImageIds): Record<string, unknown> {
  const titleLower = title.toLowerCase();

  return {
    heroEyebrow: `${title.toUpperCase()} MARKET RESEARCH`,
    heroHeading: `Drive Innovation with Data-Driven ${title} Insights`,
    heroSubheading: `Helping organizations in the ${titleLower} sector make smarter, faster business decisions through reliable market intelligence and actionable insights.`,
    // heroImage: no fallback image in fallback.ts — left unset.
    heroActions: [
      { label: 'Get a Custom Proposal', href: '/contact', isExternal: false, variant: 'primary' as const },
      { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' as const },
    ],

    trustHeading: `Trusted by ${title} Leaders`,
    trustLogos: Array.from({ length: 5 }, () => ({ name: 'Industry Partner' })),

    whatWeDoEyebrow: 'What We Do',
    whatWeDoHeading: `Our ${title} Research Services`,
    whatWeDoBody: `Unimrkt Research helps organizations in the ${titleLower} sector make confident, data-driven decisions. Our expertise spans consumer behavior, market trends, competitive intelligence, and product validation — using research methodologies such as CATI, Online Surveys, In-Depth Interviews (IDIs), and Focus Group Discussions (FGDs) to deliver high-quality, accurate data tailored to your business objectives.`,
    whatWeDoCta: { label: 'Talk to Our B2B Research Experts', href: '/contact', isExternal: false, variant: 'primary' as const },
    // whatWeDoImage: no fallback image in fallback.ts — left unset.

    whyResearchEyebrow: `Why ${title} Research?`,
    whyResearchHeading: 'Accelerate Growth with Industry Intelligence',
    whyResearchCards: [
      { title: 'Understand Customer Preferences', description: 'Identify buying behavior, evolving trends, and customer expectations to build better products and services.', iconIdentifier: 'profile-2user' },
      { title: 'Stay Ahead of Competitors', description: 'Benchmark pricing, offerings, and market positioning with real-time competitive intelligence.', iconIdentifier: 'chart' },
      { title: 'Improve Product Strategy', description: 'Validate concepts, evaluate demand, and reduce launch risk with research-backed decision making.', iconIdentifier: 'flash' },
    ],

    expertiseEyebrow: 'Our Expertise',
    expertiseHeading: `Expertise Across the ${title} Ecosystem`,
    expertiseItems: [
      { title: 'Market Analysis', iconIdentifier: 'chart' },
      { title: 'Consumer Insights', iconIdentifier: 'profile-2user' },
      { title: 'Competitive Landscape', iconIdentifier: 'mobility' },
      { title: 'Regulatory Environment', iconIdentifier: 'shield-tick' },
      { title: 'Emerging Technology', iconIdentifier: 'cpu' },
    ],

    challengesEyebrow: 'Business Challenges We Cover',
    challengesHeading: 'Key Challenges We Solve',
    challengesBody: `The ${titleLower} sector is evolving rapidly amid shifting customer expectations, competitive pressure, and regulatory change. Unimrkt Research helps businesses navigate these challenges through reliable market intelligence and actionable insights.`,
    challengesCards: [
      { title: 'Consumer Preferences', description: 'Understand evolving buying behavior and customer expectations.', iconIdentifier: 'profile-2user' },
      { title: 'Market Volatility', description: 'Track shifting demand, pricing pressure, and emerging trends.', iconIdentifier: 'flash' },
      { title: 'Competitive Intelligence', description: 'Monitor competitors, positioning, and market share.', iconIdentifier: 'chart' },
      { title: 'Regulatory & Market Dynamics', description: 'Stay informed about policy changes and industry developments.', iconIdentifier: 'shield-tick' },
    ],

    whoWeServeEyebrow: 'Who We Serve',
    whoWeServeHeading: `Supporting Every ${title} Segment`,
    whoWeServeCards: [
      { title: 'Enterprises & Corporates', description: 'Helping large organizations understand market trends and customer expectations.', iconIdentifier: 'building' },
      { title: 'Growing & Emerging Businesses', description: 'Supporting fast-moving companies with research to guide expansion.', iconIdentifier: 'flash' },
      { title: 'Suppliers & Partners', description: 'Providing insight into demand, supply chains, and competitive positioning.', iconIdentifier: 'wrench' },
      { title: 'Industry Associations & Regulators', description: 'Delivering data to inform policy and industry-wide standards.', iconIdentifier: 'shield-tick' },
    ],

    methodologiesEyebrow: 'Research Methodologies',
    methodologiesHeading: 'Proven Research Methodologies',
    methodologiesBody: `We combine qualitative and quantitative research methodologies to deliver accurate, reliable, and actionable ${titleLower} market insights tailored to your business objectives.`,
    methodologies: [
      { title: 'CATI Surveys', image: images.methodCati, accentColor: '#7f3856' },
      { title: 'Online Surveys', image: images.methodOnlineSurveys, accentColor: '#7f3856' },
      { title: 'In-Depth Interviews (IDIs)', image: images.methodIdis, accentColor: '#7f3856' },
      { title: 'Focus Group Discussions (FGDs)', image: images.methodFgds, accentColor: '#7f3856' },
    ],

    empowerEyebrow: `${title} Research`,
    empowerHeading: `Empower Your ${title} Business with Unimrkt Research`,
    empowerBody: `Unimrkt Research empowers organizations in the ${titleLower} sector with accurate market intelligence and actionable insights to support informed decision-making — helping you understand customer behavior, market trends, and competitive dynamics with confidence.`,
    empowerCta: { label: 'Get Started with Unimrkt Research Today', href: '/contact', isExternal: false, variant: 'primary' as const },
    empowerImage: images.contentMechanics,

    enquiryEyebrow: 'Get a Free Quote!',
    enquiryHeading: "Let's Discuss Your Research Needs",
    enquiryBody: `Connect with our research experts to design customized solutions that deliver accurate insights, support informed decisions, and drive measurable business growth across your target ${titleLower} markets.`,
    enquiryImage: images.enquiryBg,

    faqItems: INDUSTRY_FALLBACK_FAQ_ITEMS,

    // caseStudies fields intentionally omitted — see file header comment.

    aboutEyebrow: `About Our ${title} Research`,
    aboutHeading: `Driving Innovation with ${title} Market Intelligence`,
    aboutBody: `The ${titleLower} sector is evolving rapidly, with shifting customer expectations, new technologies, and changing competitive dynamics. At Unimrkt Research, we provide comprehensive ${titleLower} market research that helps organizations make informed, data-driven decisions.\n\nLeveraging advanced research methodologies and deep industry expertise, we deliver actionable insights into consumer behavior, market trends, competitive landscapes, and emerging opportunities — helping ${titleLower} businesses reduce risk, accelerate innovation, and achieve sustainable growth.`,
  };
}

// ---------------------------------------------------------------------------
// Services — ported verbatim from Frontend/views/services/detail/fallback.ts
// ---------------------------------------------------------------------------

const SERVICE_FALLBACK_FAQ_ITEMS = [
  {
    question: 'What is this research service?',
    answer:
      'It’s a research offering delivered by Unimrkt Research, designed around your specific objectives and combined with the right mix of methodologies for your target audience.',
  },
  {
    question: 'What does Unimrkt Research offer as part of this service?',
    answer:
      'We tailor the fieldwork, sample design, and reporting to your objectives — reach out via Talk to Our Experts for a scoped recommendation.',
  },
  {
    question: 'Which industries does Unimrkt Research serve?',
    answer:
      'We work across automotive, healthcare, BFSI, retail, technology, manufacturing, energy, FMCG, telecom, and many other sectors.',
  },
  {
    question: 'Can Unimrkt Research conduct international market research?',
    answer:
      'Yes — our research capabilities span 90+ countries and 22+ languages, combining global reach with local research expertise.',
  },
  {
    question: 'How does Unimrkt Research ensure data quality?',
    answer:
      'Every engagement runs through structured quality control — trained interviewers, live monitoring, and audited datasets — backed by ISO 20252 and ISO 27001 certified processes.',
  },
  {
    question: 'Why should businesses choose Unimrkt Research?',
    answer:
      '16+ years of research excellence, 450+ CATI workstations, and 250,000+ surveys completed annually, with a track record of turning first-hand data into confident business decisions.',
  },
  {
    question: 'How can I get started with Unimrkt Research?',
    answer:
      'Reach out via our enquiry form or Talk to Our Experts, and a research specialist will help scope your study and next steps.',
  },
];

interface ServiceImageIds {
  capabilityTelephonic: number | null;
  capabilityOnline: number | null;
  capabilityFocusGroup: number | null;
  capabilityCati: number | null;
  enquiryBg: number | null;
}

/** Mirrors resolveServiceDetail()'s fallback branch exactly. `features`
 * is the existing, previously-always-empty field Capabilities reuses —
 * see that field's schema comment. */
function buildServiceFallbackPayload(title: string, images: ServiceImageIds): Record<string, unknown> {
  const titleLower = title.toLowerCase();

  return {
    heroEyebrow: title.toUpperCase(),
    heroHeading: 'Real Conversations. Reliable Data. Better Decisions.',
    heroSubheading: `Collect first-hand market intelligence through customized ${titleLower} solutions that uncover customer opinions, validate business decisions, and fuel strategic growth.`,
    // heroImage: no fallback image in fallback.ts — left unset.
    heroActions: [
      { label: 'Get a Free Quote', href: '/contact', isExternal: false, variant: 'primary' as const },
      { label: 'Talk to Our Experts', href: '/contact', isExternal: false, variant: 'secondary' as const },
    ],

    trustHeading: 'Trusted by Global Businesses',
    trustLogos: Array.from({ length: 5 }, () => ({ name: 'Industry Partner' })),

    overviewEyebrow: `About ${title}`,
    overviewHeading: 'First-Hand Insights That Power Better Business Decisions',
    overviewBody: `${title} enables organizations to collect reliable information directly from customers, businesses, and stakeholders. At Unimrkt Research, we design customized research programs using qualitative and quantitative methodologies to help businesses understand markets, validate ideas, measure customer experience, and uncover new opportunities. Our experienced research professionals combine global reach, advanced technology, and proven methodologies to deliver accurate, high-quality data tailored to every project.`,
    // overviewImage: no fallback image in fallback.ts — left unset.
    overviewFeatures: [
      { title: 'Customized Research Solutions', iconIdentifier: 'shield-tick' },
      { title: 'Experienced Research Team', iconIdentifier: 'profile-2user' },
      { title: 'Accurate & Reliable Insights', iconIdentifier: 'medal-star' },
    ],

    capabilitiesEyebrow: 'Research',
    capabilitiesHeading: `Our ${title} Services`,
    capabilitiesBody: `Explore our comprehensive ${titleLower} solutions, designed to collect accurate, first-hand data through proven methodologies, helping businesses gain actionable insights, understand markets, and make informed decisions.`,
    // features = Capabilities (reused field, see fallback.ts's fallbackFeature()).
    features: [
      { title: 'Telephonic Surveys', description: 'Telephonic Surveys', icon: images.capabilityTelephonic, order: 0 },
      { title: 'Online Surveys', description: 'Online Surveys', icon: images.capabilityOnline, order: 1 },
      { title: 'Focus Group Discussions', description: 'Focus Group Discussions', icon: images.capabilityFocusGroup, order: 2 },
      { title: 'CATI Surveys', description: 'CATI Surveys', icon: images.capabilityCati, order: 3 },
    ],

    credentialsHeading: 'Why Unimrkt Research?',
    credentialsBody:
      'Delivering accurate first-hand data through expert researchers, global reach, proven methodologies, and quality-driven processes, helping businesses make confident decisions and achieve sustainable growth.',
    credentials: [
      { value: '450+', label: 'CATI stations team members', iconIdentifier: 'profile-2user' },
      { value: 'On-time', label: 'project deliveries', iconIdentifier: 'clock' },
      { value: '80%', label: 'Repeat business', iconIdentifier: 'clipboard-tick' },
      { value: '250,000+ CATI', label: 'surveys completed every year', iconIdentifier: 'note' },
      { value: 'State-of-the-art', label: 'CATI systems integrated with predictive dialers', iconIdentifier: 'call' },
      { value: '35-40%', label: 'Average cost savings', iconIdentifier: 'rupee' },
      { value: '300+', label: 'moderators with rich professional background', iconIdentifier: 'shield-tick' },
      { value: 'ISO20252', label: '& ISO27001 certified', iconIdentifier: 'medal-star' },
      { value: '1000+', label: 'projects of combined experience, with 100% QA audits', iconIdentifier: 'archive-book' },
      { value: '30,000 sq. ft.', label: 'with the scalability of more than 450 seats', iconIdentifier: 'people' },
      { value: '24*7', label: 'support with access to dedicated analysts', iconIdentifier: 'headphone' },
      { value: 'ESOMAR', label: 'norms followed', iconIdentifier: 'user-tag' },
      { value: '90 countries', label: '& over 22+ foreign languages for multi-industry research', iconIdentifier: 'global' },
      { value: 'GDPR', label: 'compliant', iconIdentifier: 'security-user' },
      { value: '16+', label: 'years of experience', iconIdentifier: 'star' },
    ],

    methodologiesEyebrow: 'Process',
    methodologiesHeading: 'Research Methodologies',
    methodologies: [
      { title: 'Understand Objectives', description: 'We start by clarifying your research questions and business goals so every methodology decision that follows is grounded in what you actually need to learn.' },
      { title: 'Research Design', description: 'We select and design the right mix of qualitative and quantitative methods, sample structure, and timeline for your specific objectives.' },
      { title: 'Questionnaire Development', description: 'We script and pilot-test every questionnaire to make sure it captures clean, unambiguous data before fieldwork begins.' },
      { title: 'Respondent Recruitment', description: 'We recruit and screen respondents against your target criteria, drawing on global panels and our own interviewer network.' },
    ],

    industriesEyebrow: 'Our Industries',
    industriesHeading: 'Industries We Support',
    industriesBody: `Delivering tailored ${titleLower} solutions across diverse industries, helping businesses understand markets, uncover opportunities, and make confident, data-driven decisions with accurate insights.`,
    industriesServed: [
      { title: 'Automotive', iconIdentifier: 'car' },
      { title: 'Healthcare', iconIdentifier: 'heart-pulse' },
      { title: 'BFSI', iconIdentifier: 'landmark' },
      { title: 'Retail', iconIdentifier: 'shopping-bag' },
      { title: 'Technology', iconIdentifier: 'cpu' },
      { title: 'Manufacturing', iconIdentifier: 'factory' },
      { title: 'Energy', iconIdentifier: 'flash' },
      { title: 'FMCG', iconIdentifier: 'shopping-cart' },
      { title: 'Telecom', iconIdentifier: 'radio' },
      { title: '& More', iconIdentifier: 'more' },
    ],

    enquiryEyebrow: 'Get a Free Quote!',
    enquiryHeading: "Let's Discuss Your Research Needs",
    enquiryBody:
      'Connect with our research experts to design customized solutions that deliver accurate insights, support informed decisions, and drive measurable business growth across your target markets.',
    enquiryImage: images.enquiryBg,

    faqItems: SERVICE_FALLBACK_FAQ_ITEMS,

    aboutEyebrow: `About ${title}`,
    aboutHeading: `Unlock Reliable Insights with Expert ${title}`,
    aboutBody: `At Unimrkt Research, we specialize in delivering accurate, first-hand market intelligence through customized ${titleLower} solutions tailored to your unique business objectives. Our experienced team gathers high-quality data that empowers organizations to understand customer behavior, validate business strategies, and make confident, data-driven decisions.\n\nWith 16+ years of industry experience, 450+ advanced CATI workstations, research capabilities across 90+ countries, and support in 22+ languages, we combine global reach with deep local expertise. Our commitment to quality, precision, and innovation ensures every project delivers actionable insights that help businesses reduce risk, identify new opportunities, and achieve sustainable growth.`,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();
  strapi.log.level = 'error';

  try {
    const industryImages: IndustryImageIds = {
      methodCati: await uploadAsset(strapi, 'method-cati.jpg'),
      methodOnlineSurveys: await uploadAsset(strapi, 'method-online-surveys.jpg'),
      methodIdis: await uploadAsset(strapi, 'method-idis.jpg'),
      methodFgds: await uploadAsset(strapi, 'method-fgds.jpg'),
      contentMechanics: await uploadAsset(strapi, 'content-mechanics.png'),
      enquiryBg: await uploadAsset(strapi, 'enquiry-bg.jpg'),
    };

    const serviceImages: ServiceImageIds = {
      capabilityTelephonic: await uploadAsset(strapi, 'capability-telephonic-surveys.jpg'),
      capabilityOnline: await uploadAsset(strapi, 'capability-online-surveys.jpg'),
      capabilityFocusGroup: await uploadAsset(strapi, 'capability-focus-group-discussions.jpg'),
      capabilityCati: await uploadAsset(strapi, 'capability-cati-surveys.jpg'),
      enquiryBg: industryImages.enquiryBg, // same Figma file, already uploaded
    };

    // --- Task A: industries ---
    const industries = await strapi.documents('api::industry.industry').findMany({
      fields: ['title', 'slug', 'heroHeading'],
      pagination: { limit: 1000 },
    });
    const industriesToFill = industries.filter((i: any) => !i.heroHeading);

    let industryCount = 0;
    for (const industry of industriesToFill) {
      const doc = await strapi.documents('api::industry.industry').findFirst({ filters: { slug: industry.slug } });
      if (!doc) continue;
      // eslint-disable-next-line no-await-in-loop -- one at a time for readable logs
      await strapi.documents('api::industry.industry').update({
        documentId: doc.documentId,
        data: buildIndustryFallbackPayload(industry.title, industryImages),
      });
      // eslint-disable-next-line no-await-in-loop
      await strapi.documents('api::industry.industry').publish({ documentId: doc.documentId });
      industryCount += 1;
      strapi.log.info(`[sync] Industry synced: ${industry.title}`);
    }

    // --- Task B: services ---
    const services = await strapi.documents('api::service.service').findMany({
      fields: ['title', 'slug', 'heroHeading'],
      pagination: { limit: 1000 },
    });
    const servicesToFill = services.filter((s: any) => !s.heroHeading);

    let serviceCount = 0;
    for (const service of servicesToFill) {
      const doc = await strapi.documents('api::service.service').findFirst({ filters: { slug: service.slug } });
      if (!doc) continue;
      // eslint-disable-next-line no-await-in-loop -- one at a time for readable logs
      await strapi.documents('api::service.service').update({
        documentId: doc.documentId,
        data: buildServiceFallbackPayload(service.title, serviceImages),
      });
      // eslint-disable-next-line no-await-in-loop
      await strapi.documents('api::service.service').publish({ documentId: doc.documentId });
      serviceCount += 1;
      strapi.log.info(`[sync] Service synced: ${service.title}`);
    }

    console.log(`[sync] Done. Industries synced: ${industryCount}/${industries.length}. Services synced: ${serviceCount}/${services.length}.`);
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  console.error('[sync] Failed:', err);
  process.exit(1);
});
