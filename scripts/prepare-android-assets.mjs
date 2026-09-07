import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const assetsDir = join(root, 'assets');
const legacySource = join(root, 'icons', 'icon-512.png');
const maskableSource = join(root, 'icons', 'icon-512-maskable.png');

const size = 1024;
const background = { r: 16, g: 19, b: 18, alpha: 1 }; // #101312

await rm(assetsDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });

// Legacy / non-adaptive launcher fallback.
await sharp(legacySource)
  .resize(size, size, { fit: 'fill' })
  .png()
  .toFile(join(assetsDir, 'icon.png'));

// Capacitor Assets also recognizes icon-only.png as a general icon source.
await sharp(maskableSource)
  .resize(size, size, { fit: 'fill' })
  .png()
  .toFile(join(assetsDir, 'icon-only.png'));

// Build a real adaptive foreground from the existing maskable artwork.
// The source already has Android-safe padding. Pixels matching RUTA's dark
// background are made transparent so Android can apply its own circle,
// squircle, rounded-square, themed, tablet and launcher masks cleanly.
const { data, info } = await sharp(maskableSource)
  .resize(size, size, { fit: 'fill' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += info.channels) {
  const dr = Math.abs(data[i] - background.r);
  const dg = Math.abs(data[i + 1] - background.g);
  const db = Math.abs(data[i + 2] - background.b);
  if (Math.max(dr, dg, db) <= 3) data[i + 3] = 0;
}

await sharp(data, { raw: info })
  .png()
  .toFile(join(assetsDir, 'icon-foreground.png'));

// Separate adaptive background layer.
await sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background,
  },
})
  .png()
  .toFile(join(assetsDir, 'icon-background.png'));

const expected = ['icon.png', 'icon-only.png', 'icon-foreground.png', 'icon-background.png'];
for (const file of expected) {
  const meta = await sharp(join(assetsDir, file)).metadata();
  if (meta.width !== size || meta.height !== size) {
    throw new Error(`${file} was generated at ${meta.width}x${meta.height}; expected ${size}x${size}.`);
  }
}

console.log(`Prepared Android adaptive icon sources in ${assetsDir}: ${expected.join(', ')}`);
