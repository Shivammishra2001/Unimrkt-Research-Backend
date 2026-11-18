/**
 * Global → Chat Widget copy seeded by seed-site-content.ts. Mirrors the frontend's built-in fallback
 * (Frontend/views/ui/chat/chatContent.ts) in Strapi's storage shape: multi-value fields are one item per line,
 * keywords are comma-separated. Figures match the rest of the site (90+ countries, 22+ languages, ISO 20252 & 27001).
 */
const lines = (...items: string[]) => items.join('\n');

/** What the first seed wrote. Rows still holding exactly this were never edited, so they may be upgraded. */
export const OLD_QUICK_ACTION_LABELS = ['Request a Quote', 'Speak with an Analyst', 'General Enquiry'];
/** Text fields the first seed wrote: each is upgraded only while it still holds exactly this value. */
export const OLD_TEXT = {
  greeting: "👋 Hi there! I'm the Unimrkt Research assistant. How can we help with your market research needs today?",
  placeholder: 'Type your message…',
  // Typed messages are not sent anywhere, so "we've received your message" is no longer true.
  acknowledgement: "Thanks — we've received your message and a research consultant will be in touch shortly.",
};

export const CHAT_FIELDS = {
  greeting: "👋 Hi there! I'm the Unimrkt Research assistant. Ask me about our services, coverage or industries — or request a callback and a research consultant will get in touch.",
  placeholder: 'Ask about CATI, healthcare, countries…',
  acknowledgement: "Thanks for your message! I don't have a ready answer for that one, but our research team does — leave your details and they'll get back to you, usually within one business day.",
  formButtonLabel: 'Request a Callback',
  proposalButtonLabel: 'Request Proposal →',
  formIntro: 'Share a few details and a research consultant will reach out, usually within one business day.',
  serviceOptions: lines('Primary Research (CATI/CAWI/CAPI)', 'Qualitative Research', 'Quantitative Research', 'B2B / Healthcare Panels', 'Business Research', 'Other'),
  formSuccess: 'Thanks {name}! Our research team will reach out on {contact} shortly.',
};

export const CHAT_QUICK_ACTIONS = [
  {
    label: 'Request a Quote / Callback',
    action: 'lead_form',
    reply: "Great — let's get you a tailored quote. Share a few details below and a research consultant will call you back.",
    showFormButton: false,
  },
  {
    label: 'Our Research Services',
    action: 'reply',
    reply: 'We run end-to-end market research, from fieldwork to insight:',
    highlights: lines(
      'Primary research: CATI (telephonic), CAWI (online) and CAPI / intercept interviews',
      'Qualitative: focus group discussions, in-depth interviews, online bulletin boards',
      'Quantitative: large-sample surveys, survey programming, data processing & tabulation',
      'B2B & healthcare: verified professional and physician audiences',
      'Business research: competitor benchmarking and industry trend monitoring',
    ),
    linkLabel: 'Explore our services',
    linkHref: '/services',
    showFormButton: true,
  },
  {
    label: 'Global Coverage & Quality',
    action: 'reply',
    reply: 'Multi-country fieldwork, run to certified quality standards:',
    highlights: lines(
      'Phone, online, face-to-face and hybrid fieldwork',
      'Offices in Gurugram (India), Great Neck NY (USA) and Oxford (UK)',
      'ESOMAR and MRSI standards, GDPR-compliant data handling',
      'Quality checks on every interview, before data reaches you',
    ),
    stats: lines('90+ Countries', '22+ Languages', 'ISO 20252 & ISO 27001'),
    linkLabel: 'About Unimrkt',
    linkHref: '/our-company',
    showFormButton: true,
  },
  {
    label: 'Industries We Serve',
    action: 'reply',
    reply: 'Sector-specific research across 27 industries, including:',
    highlights: lines('Automotive, mobility & industrial', 'Life sciences & healthcare', 'BFSI, tech & telecom', 'FMCG, retail, consumer & media', 'Energy & natural resources'),
    stats: lines('27 Industries', '90+ Countries'),
    linkLabel: 'View all industries',
    linkHref: '/industries',
    showFormButton: true,
  },
  {
    label: 'Careers & Partnerships',
    action: 'reply',
    reply: "Want to work with Unimrkt? Here's how:",
    highlights: lines(
      'Careers: roles across research, fieldwork, data processing and operations',
      'Respondents: join our global panel and share your views in studies',
      'Agencies & fieldwork partners: get in touch to collaborate on multi-country projects',
    ),
    linkLabel: 'Work with us',
    linkHref: '/work-with-us',
    showFormButton: false,
  },
];

export const CHAT_KEYWORD_REPLIES = [
  {
    keywords: 'quote, price, pricing, cost, budget, call, callback, contact, proposal, study, studies, hire, rfp',
    reply: 'I can set that up — share your details below and our research team will come back with a tailored proposal.',
    opensForm: true,
  },
  {
    keywords: 'cati, cawi, capi, telephonic, phone survey, online survey, survey, fieldwork',
    reply: 'Our primary research teams field studies in every major mode:',
    highlights: lines('CATI: telephonic interviews by trained, multilingual interviewers', 'CAWI: online surveys, programmed and hosted in-house', 'CAPI: face-to-face and intercept interviews', 'Survey programming, data processing and tabulation included'),
    linkLabel: 'CATI surveys',
    linkHref: '/services/cati-surveys',
  },
  {
    keywords: 'qualitative, focus group, fgd, idi, in-depth, interview, bulletin board',
    reply: 'Our qualitative research uncovers the "why" behind behaviour:',
    highlights: lines('Focus group discussions (in person and online)', 'In-depth interviews with consumers and professionals', 'Online bulletin boards and in-home usage tests'),
    linkLabel: 'Qualitative research',
    linkHref: '/services/qualitative-research',
  },
  {
    keywords: 'healthcare, health, pharma, medical, physician, doctor, hcp, patient, life science',
    reply: 'We run healthcare and life-sciences research with verified audiences:',
    highlights: lines('Physicians, specialists and other HCPs', 'Patients and caregivers', 'Hospital, pharmacy and payer stakeholders'),
    linkLabel: 'Life sciences & healthcare',
    linkHref: '/industries/life-sciences-and-healthcare',
  },
  {
    keywords: 'b2b, business to business, decision maker, panel, respondent, it decision',
    reply: 'We reach hard-to-find B2B audiences across 90+ countries:',
    highlights: lines('C-suite and IT decision makers', 'SMB owners and procurement leads', 'Industry specialists, screened against your criteria'),
    linkLabel: 'Our global panel',
    linkHref: '/services/global-panel',
  },
  {
    keywords: 'country, countries, global, coverage, language, international, multi-country, region',
    reply: 'We run fieldwork in 90+ countries and 22+ languages, managed from offices in India, the USA and the UK.',
    highlights: lines('Phone, online, face-to-face and hybrid modes', 'Native-language interviewers and translation'),
    linkLabel: 'About Unimrkt',
    linkHref: '/our-company',
  },
  {
    keywords: 'iso, quality, gdpr, esomar, mrsi, certified, certification, compliance, security, privacy',
    reply: 'Quality and data security are built into every project:',
    highlights: lines('ISO 20252 (market research) and ISO 27001 (information security) certified', 'ESOMAR and MRSI standards', 'GDPR-compliant data handling'),
    linkLabel: 'About Unimrkt',
    linkHref: '/our-company',
  },
  {
    keywords: 'career, job, hiring, vacancy, intern, work with you, join your team',
    reply: "We're always keen to meet researchers, interviewers and data specialists.",
    highlights: lines('See open roles and apply on our Work With Us page'),
    linkLabel: 'Work with us',
    linkHref: '/work-with-us',
  },
  {
    keywords: 'office, location, address, located, where are you, visit',
    reply: 'Our offices:',
    highlights: lines('Gurugram, India', 'Great Neck, New York, USA', 'Oxford, United Kingdom', 'Email: sales@unimrkt.com'),
    linkLabel: 'Contact us',
    linkHref: '/contact',
  },
  {
    keywords: 'industry, industries, sector, automotive, bfsi, banking, fmcg, retail, telecom',
    reply: 'We serve 27 industries, from automotive and BFSI to FMCG, tech and healthcare.',
    linkLabel: 'View all industries',
    linkHref: '/industries',
  },
  {
    keywords: 'service, services, research, what do you do, offer',
    reply: 'We offer primary, qualitative, quantitative and business research, plus research support (programming, data processing, dashboards).',
    linkLabel: 'Explore our services',
    linkHref: '/services',
  },
];
