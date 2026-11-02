/**
 * Binds the Figma node 384:6205 photos to the "Automotives" industry — the
 * hero background (automotive plant) and the What We Do image (engineer at the
 * car blueprint) — when those fields are still empty. Never overwrites an
 * image an editor has chosen, and republishes only when something changed.
 *
 * Run once per environment:  npm run seed:industry-media
 */
import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';

const UID = 'api::industry.industry';
const ASSETS_DIR = path.join(__dirname, 'seed-assets', 'figma');

const BINDINGS: Array<{ slug: string; field: 'heroImage' | 'whatWeDoImage'; file: string }> = [
  { slug: 'automotives', field: 'heroImage', file: 'automotive-plant.jpg' },
  { slug: 'automotives', field: 'whatWeDoImage', file: 'content-research-services.jpg' },
];

const AUTOMOTIVES_WHAT_WE_DO_BODY =
  'Unimrkt Research is a trusted automotive market research partner, delivering reliable data and actionable insights to help manufacturers, OEMs, suppliers, dealerships, EV companies, and mobility providers make informed business decisions. Our expertise spans consumer behavior, market trends, competitive intelligence, product validation, and emerging opportunities across the automotive ecosystem.\n\n' +
  'Using advanced research methodologies such as CATI, Online Surveys, In-Depth Interviews (IDIs), Focus Group Discussions (FGDs), and Telephonic Surveys, we provide high-quality, accurate data tailored to your business objectives. From tracking regulatory changes and understanding customer preferences to evaluating new market opportunities, our research empowers organizations to reduce risk, drive innovation, and achieve sustainable growth in the evolving automotive industry.';

const AUTOMOTIVES_EXPERTISE: Record<string, string> = {
  Mobility: 'Shared Mobility\nAutonomous Vehicles\nConnectivity\nIntegrated Transportation',
  'Automobile Manufacturing':
    'OEM Vehicle Manufacturers\nElectric Vehicle Systems\nHeavy-Duty Commercial Vehicles\nLight Commercial Vehicles\nOff-Highway Equipment\nBuses / Trucks\nMaterial Handling Equipment',
  Accessories: 'OEM Accessories\nAftermarket Components\nInterior Systems\nPerformance Parts',
  'Two-Wheeler & Three-Wheeler Vehicles': 'Motorbikes\nScooters\nMopeds\nEV Segment\nThree-Wheeler',
  'Automobile Technology':
    'Electric Vehicles\nConnected & Automated Vehicles\nTelematics\nFuel Economy Technologies\nHuman Machine Interface\nADAS\nSmart Home Integration\nV2V / V2P / V2N Communication',
};

async function uploadAsset(strapi: any, filename: string): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: filename } });
  if (existing) return existing.id;
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const mime = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const [uploaded] = await strapi.plugin('upload').service('upload').upload({
    data: {},
    files: { path: filePath, filepath: filePath, name: filename, originalFilename: filename, type: mime, mimetype: mime, size: fs.statSync(filePath).size },
  });
  return uploaded?.id ?? null;
}

async function main() {
  const appContext = await compileStrapi();
  const strapi: any = await createStrapi(appContext).load();
  strapi.log.level = 'error';
  try {
    const changed = new Set<string>();
    for (const { slug, field, file } of BINDINGS) {
      const entry = await strapi.documents(UID).findFirst({ filters: { slug }, populate: [field] });
      if (!entry || entry[field]) continue;
      const id = await uploadAsset(strapi, file);
      if (!id) continue;
      await strapi.documents(UID).update({ documentId: entry.documentId, data: { [field]: id } });
      changed.add(entry.documentId);
      // eslint-disable-next-line no-console
      console.log(`[industry-media] ${slug}.${field} <- ${file}`);
    }
    // Figma 384:6362 draws the Automotives What We Do copy as two full paragraphs. Only an entry still
    // carrying the older shortened copy is updated; anything an editor rewrote is left alone.
    const entry = await strapi.documents(UID).findFirst({ filters: { slug: 'automotives' } });
    if (entry && !String(entry.whatWeDoBody ?? '').includes('From tracking regulatory changes')) {
      await strapi.documents(UID).update({ documentId: entry.documentId, data: { whatWeDoBody: AUTOMOTIVES_WHAT_WE_DO_BODY } });
      changed.add(entry.documentId);
      // eslint-disable-next-line no-console
      console.log('[industry-media] automotives.whatWeDoBody <- two-paragraph Figma copy');
    }
    // Figma 384:6205's Expertise cards expand to a sub-service list (one per line in `description`).
    // Fill only the items that have no description yet; titles, icons and any edited text stay as they are.
    const withItems = await strapi.documents(UID).findFirst({ filters: { slug: 'automotives' }, populate: { expertiseItems: true } });
    if (withItems?.expertiseItems?.length) {
      let touched = false;
      const items = withItems.expertiseItems.map((item: any) => {
        const description = item.description || AUTOMOTIVES_EXPERTISE[item.title];
        if (description && !item.description) touched = true;
        return { id: item.id, title: item.title, iconIdentifier: item.iconIdentifier, description };
      });
      if (touched) {
        await strapi.documents(UID).update({ documentId: withItems.documentId, data: { expertiseItems: items } });
        changed.add(withItems.documentId);
        // eslint-disable-next-line no-console
        console.log('[industry-media] automotives.expertiseItems <- sub-service lists');
      }
    }
    for (const documentId of changed) await strapi.documents(UID).publish({ documentId });
    // eslint-disable-next-line no-console
    console.log(changed.size ? '[industry-media] Done.' : '[industry-media] Nothing to bind — every image is already set.');
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[industry-media] Failed:', err);
  process.exit(1);
});
