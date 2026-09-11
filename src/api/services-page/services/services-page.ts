import { factories } from '@strapi/strapi';

/** Every nested component field needs its own explicit populate branch —
 * `true` alone only populates the field's own scalars, not further-nested
 * relations (hero.actions, valueProps[].icon, workflow.steps[].icon,
 * faq.items, cta.actions/background). Mirrors buildGlobalPopulate()'s
 * same reasoning for the same kind of singleType. */
export function buildServicesPagePopulate() {
  return {
    hero: { populate: { media: true, actions: true } },
    valuePropsBackground: true,
    valueProps: { populate: { icon: true } },
    workflow: { populate: { steps: { populate: { icon: true } } } },
    faq: { populate: { background: true, items: true } },
    cta: { populate: { actions: true, background: true } },
  };
}

export default factories.createCoreService('api::services-page.services-page');
