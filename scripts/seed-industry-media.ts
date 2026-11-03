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

const AUTOMOTIVES_EMPOWER_TAIL =
  'From product development and brand positioning to customer satisfaction and market expansion, our customized research solutions are designed to address the unique challenges of the automotive industry. Partner with Unimrkt Research to gain data-driven insights that fuel innovation, strengthen your competitive advantage, and accelerate sustainable business growth.';

const AUTOMOTIVES_EXPERTISE: Record<string, string> = {
  Mobility: 'Shared Mobility\nAutonomous Vehicles\nConnectivity\nIntegrated Transportation',
  'Automobile Manufacturing':
    'OEM Vehicle Manufacturers\nElectric Vehicle Systems\nHeavy-Duty Commercial Vehicles\nLight Commercial Vehicles\nOff-Highway Equipment\nBuses / Trucks\nMaterial Handling Equipment',
  Accessories: 'OEM Accessories\nAftermarket Components\nInterior Systems\nPerformance Parts',
  'Two-Wheeler & Three-Wheeler Vehicles': 'Motorbikes\nScooters\nMopeds\nEV Segment\nThree-Wheeler',
  'Automobile Technology':
    'Electric Vehicles\nConnected & Automated Vehicles\nTelematics\nFuel Economy Technologies\nHuman Machine Interface\nADAS\nSmart Home Integration\nV2V / V2P / V2N Communication',
};

const AUTOMOTIVES_WHO_WE_SERVE: Record<string, { old: string; copy: string }> = {
  'Automotive Manufacturers & OEMs': {
    old: 'Helping manufacturers understand market trends, customer expectations, and product opportunities.',
    copy:
      'Helping manufacturers uncover market trends, understand evolving customer expectations, identify emerging opportunities, and make informed product decisions. Our research delivers actionable insights into consumer needs, competitive landscapes, industry dynamics, and growth areas, enabling businesses to develop relevant products, strengthen market positioning, improve customer experiences, and drive sustainable growth.',
  },
  'Auto Component Suppliers': {
    old: 'Providing insights into demand forecasting, supply chains, and competitive positioning.',
    copy:
      'Providing actionable insights into demand forecasting, supply chain dynamics, market trends, and competitive positioning. Our research helps businesses anticipate customer needs, identify growth opportunities, optimize operations, understand competitors, and make informed strategic decisions that strengthen market presence, improve efficiency, and support sustainable business growth across evolving markets.',
  },
  'EV & Mobility Companies': {
    old: 'Supporting electric vehicle brands, charging providers, and mobility innovators with future-focused research.',
    copy:
      'Supporting electric vehicle brands, charging providers, and mobility innovators with future-focused research. We deliver insights into consumer adoption, market trends, charging infrastructure, competitive landscapes, emerging technologies, and mobility preferences, helping businesses identify opportunities, refine strategies, accelerate innovation, and build solutions that meet the evolving needs of tomorrow’s transportation ecosystem.',
  },
  'Dealerships, Fleet & Technology Companies': {
    old: 'Helping dealerships, fleet operators, and mobility companies drive smarter decisions through actionable market insights.',
    copy:
      'Helping dealerships, fleet operators, and mobility companies make smarter decisions through actionable market insights. Our research explores customer preferences, market trends, competitive dynamics, purchasing behaviour, and emerging mobility opportunities, enabling businesses to optimize strategies, improve customer experiences, strengthen market positioning, identify growth opportunities, and confidently navigate an evolving automotive landscape.',
  },
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
    // Figma 384:6363 draws the Empower body as two paragraphs; append the second to an entry that only has the first.
    if (entry && entry.empowerBody && !String(entry.empowerBody).includes('From product development')) {
      await strapi.documents(UID).update({ documentId: entry.documentId, data: { empowerBody: `${String(entry.empowerBody).trim()}\n\n${AUTOMOTIVES_EMPOWER_TAIL}` } });
      changed.add(entry.documentId);
      // eslint-disable-next-line no-console
      console.log('[industry-media] automotives.empowerBody <- two-paragraph Figma copy');
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
    // Figma 384:6218-6221 draws the Who We Serve cards with long paragraphs. Only a card still carrying the
    // older shortened copy is updated; anything an editor rewrote is left alone.
    const withWho = await strapi.documents(UID).findFirst({ filters: { slug: 'automotives' }, populate: { whoWeServeCards: true } });
    if (withWho?.whoWeServeCards?.length) {
      let touched = false;
      const cards = withWho.whoWeServeCards.map((card: any) => {
        const target = AUTOMOTIVES_WHO_WE_SERVE[card.title];
        const description = target && card.description === target.old ? target.copy : card.description;
        if (description !== card.description) touched = true;
        return { id: card.id, title: card.title, iconIdentifier: card.iconIdentifier, description };
      });
      if (touched) {
        await strapi.documents(UID).update({ documentId: withWho.documentId, data: { whoWeServeCards: cards } });
        changed.add(withWho.documentId);
        // eslint-disable-next-line no-console
        console.log('[industry-media] automotives.whoWeServeCards <- Figma paragraphs');
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
