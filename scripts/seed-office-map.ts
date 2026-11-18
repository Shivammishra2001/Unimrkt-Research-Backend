/**
 * Fills the new Map latitude / longitude / label fields on the Contact page offices with the coordinates the map
 * already uses (matched by office name), so the pins keep working when an office is renamed. Only empty fields are
 * filled; values an editor has entered are kept. Direct row update (draft and published), no republish.
 *
 * Run once per environment:  npm run seed:office-map
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';
import { notifyRevalidate } from '../src/utils/revalidate';

const KNOWN: Record<string, { lat: number; lng: number; label: string }> = {
  'india office': { lat: 28.5018, lng: 77.0884, label: 'India Office' },
  'united states of america': { lat: 40.8007, lng: -73.7285, label: 'USA Office' },
  'united kingdom': { lat: 51.7595, lng: -1.2085, label: 'UK Office' },
};

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  try {
    const offices = await strapi.db.query('contact.office-location').findMany({});
    let changed = 0;
    for (const o of offices) {
      const k = KNOWN[String(o.name ?? '').trim().toLowerCase()];
      if (!k) continue;
      const data: Record<string, unknown> = {};
      if (o.mapLatitude == null) data.mapLatitude = k.lat;
      if (o.mapLongitude == null) data.mapLongitude = k.lng;
      if (!o.mapLabel) data.mapLabel = k.label;
      if (Object.keys(data).length === 0) continue;
      await strapi.db.query('contact.office-location').update({ where: { id: o.id }, data });
      changed += 1;
    }
    if (changed) {
      await notifyRevalidate('pages');
      await notifyRevalidate('page-contact');
    }
    // eslint-disable-next-line no-console
    console.log(`[office-map] ${changed} office row(s) filled`);
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error('[office-map] failed:', err);
    process.exit(1);
  },
);
