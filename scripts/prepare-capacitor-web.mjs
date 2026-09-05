import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const out = resolve(root, 'www');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const files = ['cloud-sync.js', 'manifest.json', 'service-worker.js'];
for (const file of files) {
  await cp(resolve(root, file), resolve(out, file));
}
await cp(resolve(root, 'icons'), resolve(out, 'icons'), { recursive: true });

let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html.replace(
  "if('serviceWorker' in navigator){",
  "if('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()){"
);
await writeFile(resolve(out, 'index.html'), html, 'utf8');

console.log('Prepared Capacitor web assets in www/');
