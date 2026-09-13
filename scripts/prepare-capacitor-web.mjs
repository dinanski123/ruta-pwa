import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const root = process.cwd();
const out = resolve(root, 'www');
const bundle = resolve(root, 'src-bundle');

async function unpack(name) {
  const parts = (await readdir(bundle))
    .filter(file => file.startsWith(`${name}.gz.b64.part`))
    .sort();
  if (!parts.length) throw new Error(`Missing bundled source for ${name}`);
  const encoded = (await Promise.all(parts.map(file => readFile(resolve(bundle, file), 'utf8'))))
    .join('')
    .replace(/\s+/g, '');
  return gunzipSync(Buffer.from(encoded, 'base64'));
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'index.html'), await unpack('index.html'));
await writeFile(resolve(out, 'cloud-sync.js'), await unpack('cloud-sync.js'));
for (const file of ['manifest.json', 'service-worker.js']) {
  await cp(resolve(root, file), resolve(out, file));
}
await cp(resolve(root, 'icons'), resolve(out, 'icons'), { recursive: true });
console.log('Prepared RUTA v1.4.0 static web assets in www/');
