/**
 * One-off: point every team member at the transparent cut-out photo (`team-*.webp`) instead of the flattened black-background JPG.
 * Run with the Strapi server stopped:  npx ts-node scripts/relink-team-photos.ts
 */
import path from 'path';
import fs from 'fs';
import { compileStrapi, createStrapi } from '@strapi/strapi';

const ASSETS_DIR = path.join(__dirname, 'seed-assets', 'figma');
const UID = 'api::team-member.team-member';

async function main() {
  const app: any = await createStrapi(await compileStrapi()).load();
  const members = await app.documents(UID).findMany({ limit: 100 });
  for (const m of members as unknown as Array<{ documentId: string; name: string }>) {
    const filename = `team-${m.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-panel.webp`;
    const filePath = path.join(ASSETS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      app.log.warn(`[relink] no ${filename} for ${m.name}`);
      continue;
    }
    let file = await app.db.query('plugin::upload.file').findOne({ where: { name: filename } });
    if (!file) {
      [file] = await app.plugin('upload').service('upload').upload({
        data: {},
        files: { path: filePath, filepath: filePath, name: filename, originalFilename: filename, type: 'image/webp', mimetype: 'image/webp', size: fs.statSync(filePath).size },
      });
    }
    await app.documents(UID).update({ documentId: m.documentId, data: { photo: file.id } });
    await app.documents(UID).publish({ documentId: m.documentId });
    app.log.info(`[relink] ${m.name} -> ${filename}`);
  }
  await app.destroy();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
