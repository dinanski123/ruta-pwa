import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const assetsDir = join(root, 'assets');
const sourceIcon = join(root, 'icons', 'icon-512.png');
const outputIcon = join(assetsDir, 'icon.png');

await rm(assetsDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });

await sharp(sourceIcon)
  .resize(1024, 1024, { fit: 'fill' })
  .png()
  .toFile(outputIcon);

console.log(`Prepared Android icon source at ${outputIcon}`);
