import { factories } from '@strapi/strapi';

/**
 * The single source of truth for `page`'s deep-populate shape — one
 * branch per dynamic-zone component. Never trust a caller-supplied
 * `populate` query string; the controller always forces this instead.
 */
export function buildPagePopulate() {
  return {
    seo: { populate: ['shareImage'] },
    blocks: {
      on: {
        'blocks.hero': { populate: { media: true, actions: true, sideMenu: true } },
        'blocks.content': { populate: { media: true } },
        'blocks.feature-grid': { populate: { items: { populate: { icon: true, link: true } } } },
        'blocks.testimonials': {
          populate: { testimonials: { populate: { avatar: true, companyLogo: true } } },
        },
        'blocks.cta': { populate: { actions: true, background: true } },
        'blocks.stats-band': { populate: { items: { populate: { image: true } } } },
        'blocks.service-band': { populate: { background: true, cta: true, items: true } },
        'blocks.industry-grid': {
          populate: { background: true, cta: true, items: { populate: { image: true } } },
        },
        'blocks.media-gallery': {
          populate: { actions: true, items: { populate: { media: true } } },
        },
        'blocks.faq': { populate: { background: true, items: true, cta: true } },
        'blocks.blog-teaser': {
          populate: { actions: true, posts: { populate: { image: true } } },
        },
        // items reuse blocks.feature-item (same icon+link populate as
        // blocks.feature-grid's items above).
        'blocks.why-choose-us': { populate: { items: { populate: { icon: true, link: true } } } },
        'blocks.process-steps': { populate: { steps: { populate: { icon: true } } } },
        // Dedicated-page content (one block per page entry) — each mirrors
        // the populate of the single type it replaced.
        'page-content.our-company': {
          populate: {
            heroImage: true,
            heroCta: true,
            stats: true,
            aboutImage: true,
            insightsCards: { populate: { image: true, icon: true } },
            ecosystemCards: { populate: { image: true, icon: true } },
            valuesCards: { populate: { image: true, icon: true } },
            industriesCards: { populate: { image: true, icon: true } },
            faqItems: true,
            seo: { populate: { shareImage: true } },
          },
        },
        'page-content.work-with-us': {
          populate: {
            heroImage: true,
            heroCta: true,
            valuesCards: { populate: { image: true, icon: true } },
            benefitsImage: true,
            benefits: { populate: { image: true, icon: true } },
            jobs: true,
            journeySteps: { populate: { image: true, icon: true } },
            faqItems: true,
            seo: { populate: { shareImage: true } },
          },
        },
        'page-content.case-study': {
          populate: {
            heroImage: true,
            heroCta: true,
            approachSteps: { populate: { image: true, icon: true } },
            testimonials: true,
            listingFaqItems: true,
            bottomCtaAction: true,
          },
        },
        'page-content.contact': {
          populate: {
            heroImage: true,
            heroCta: true,
            stats: true,
            offices: { populate: { image: true } },
            formImage: true,
            faqItems: true,
            workWithUsCta: true,
            workWithUsImage: true,
            seo: { populate: { shareImage: true } },
          },
        },
        'page-content.our-team': {
          populate: { heroImage: true, bottomCtaAction: true, seo: { populate: { shareImage: true } } },
        },
        'page-content.industries': {
          populate: {
            heroPrimaryCta: true,
            heroSecondaryCta: true,
            bandCta: true,
            faqCta: true,
            finalCtaAction: true,
            heroImage: true,
            introImage: true,
            gridBackgroundImage: true,
            gridCardFallbackImage: true,
            bandBackgroundImage: true,
            bandPersonImage: true,
            insightsBackgroundImage: true,
            insightsCutoutImage: true,
            finalCtaImage: true,
            beyondCards: { populate: { icon: true } },
            insightsItems: { populate: { icon: true } },
            caseCards: { populate: { icon: true } },
            reachStats: { populate: { icon: true } },
            processSteps: { populate: { icon: true } },
            testimonials: true,
            faqItems: true,
            seo: { populate: { shareImage: true } },
          },
        },
        'page-content.privacy-policy': {
          populate: {
            heroImage: true,
            tocItems: true,
            lawfulPurposesList: true,
            lawfulBasisList: true,
            panelDataSourcesList: true,
            seo: { populate: { shareImage: true } },
          },
        },
      },
    },
  };
}

export default factories.createCoreService('api::page.page');
