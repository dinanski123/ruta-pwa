import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const out = resolve(root, 'www');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const file of ['ruta-v132-unified.js', 'manifest.json', 'service-worker.js']) {
  await cp(resolve(root, file), resolve(out, file));
}
await cp(resolve(root, 'icons'), resolve(out, 'icons'), { recursive: true });

let cloud = await readFile(resolve(root, 'cloud-sync.js'), 'utf8');
const patch = await readFile(resolve(root, 'ruta-v132-unified.js'), 'utf8');
cloud = cloud.replace("const RUTA_VERSION = '1.2.0';", "const RUTA_VERSION = '1.3.2';");
const marker = '  init();\n})();';
if (!cloud.includes(marker)) throw new Error('RUTA cloud sync bundle marker was not found');
cloud = cloud.replace(marker, `${patch}\n\n  init();\n})();`);
await writeFile(resolve(out, 'cloud-sync.js'), cloud, 'utf8');

let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html.replace(
  "if('serviceWorker' in navigator){",
  "if('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()){"
);
html = html.replace(/service-worker\.js\?v=[^'\"]+/g, 'service-worker.js?v=15-unified-sync');
await writeFile(resolve(out, 'index.html'), html, 'utf8');

console.log('Prepared RUTA v1.3.2 unified Capacitor web assets in www/');
