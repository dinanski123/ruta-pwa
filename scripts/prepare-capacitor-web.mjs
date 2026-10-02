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
const index = (await unpack('index.html')).toString('utf8');
const vercelAnalytics = `
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
`;
const safeAreaStyle = `
<style id="ruta-safe-area">
  :root {
    --ruta-safe-top: env(safe-area-inset-top, 0px);
    --ruta-safe-right: env(safe-area-inset-right, 0px);
    --ruta-safe-bottom: env(safe-area-inset-bottom, 0px);
    --ruta-safe-left: env(safe-area-inset-left, 0px);
  }
  html, body {
    width: 100%;
    min-height: 100%;
    box-sizing: border-box;
  }
  body {
    margin: 0;
    padding-top: var(--ruta-safe-top);
    padding-right: var(--ruta-safe-right);
    padding-bottom: var(--ruta-safe-bottom);
    padding-left: var(--ruta-safe-left);
  }
</style>
`;

const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
const systemStatus = '<script src="/system-status.js?v=4" defer></script>';
const withViewport = /<meta\\s+name=["']viewport["'][^>]*>/i.test(index)
  ? index.replace(/<meta\\s+name=["']viewport["'][^>]*>/i, viewportMeta)
  : index.replace('</head>', `${viewportMeta}</head>`);
const injectedIndex = withViewport.replace('</head>', `${safeAreaStyle}</head>`).replace('</body>', `${vercelAnalytics}${systemStatus}</body>`);
await writeFile(resolve(out, 'index.html'), injectedIndex);
await writeFile(resolve(out, 'cloud-sync.js'), await unpack('cloud-sync.js'));
for (const file of ['manifest.json', 'service-worker.js', 'system-status.js']) {
  await cp(resolve(root, file), resolve(out, file));
}
await cp(resolve(root, 'icons'), resolve(out, 'icons'), { recursive: true });
console.log('Prepared RUTA v1.4.0 static web assets with Vercel Web Analytics.');
