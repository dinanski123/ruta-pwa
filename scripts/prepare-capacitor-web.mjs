import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const webDir = join(root, 'www');

const excluded = new Set([
  '.git',
  '.github',
  '.translation-go',
  'android',
  'assets',
  'capacitor.config.json',
  'node_modules',
  'package-lock.json',
  'package.json',
  'README.md',
  'scripts',
  'www'
]);

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  await cp(join(root, entry.name), join(webDir, entry.name), { recursive: true });
}

console.log(`Prepared Capacitor web assets in ${webDir}`);
