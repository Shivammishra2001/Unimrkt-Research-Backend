/**
 * Sets the Content Manager "entry title" (mainField) of every component that
 * has a `heading` — or failing that a `title` — text field, so a section block
 * in the page editor reads as its own heading instead of "Entry 1".
 * Section *names* (the accordion headers) come from each component's
 * displayName in its schema.json.
 *
 * Idempotent; run once per environment:  npm run set-component-labels
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  strapi.log.level = 'error';

  try {
    const service = strapi.plugin('content-manager').service('components');
    let n = 0;
    for (const [uid, component] of Object.entries<any>(strapi.components)) {
      const attrs = component.attributes ?? {};
      const isText = (name: string) => attrs[name] && ['string', 'text'].includes(attrs[name].type);
      const mainField = ['heading', 'title', 'label', 'question'].find(isText);
      if (!mainField) continue;

      const current = await service.findConfiguration({ uid, ...component });
      if (current.settings?.mainField === mainField) continue;
      await service.updateConfiguration({ uid, ...component }, { settings: { ...current.settings, mainField } });
      n += 1;
    }
    // eslint-disable-next-line no-console
    console.log(`[labels] Set the entry title on ${n} components.`);
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[labels] Failed:', err);
  process.exit(1);
});
