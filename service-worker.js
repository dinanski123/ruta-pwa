const CACHE_NAME = 'ruta-cache-v15-unified-sync';
const APP_SHELL = [
  './',
  './index.html',
  './cloud-sync.js',
  './ruta-v132-unified.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

async function networkFirst(request, fallback) {
  try {
    const response = await fetch(request, {cache:'no-store'});
    if (!response || !response.ok) throw new Error(`HTTP ${response?.status || 0}`);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : undefined);
  }
}

async function unifiedCloudSync(request) {
  const patchUrl = new URL('./ruta-v132-unified.js', self.location.href).href;
  const [baseResponse, patchResponse] = await Promise.all([
    networkFirst(request),
    networkFirst(new Request(patchUrl, {cache:'no-store'}))
  ]);
  if (!baseResponse || !patchResponse) throw new Error('RUTA unified sync bundle is unavailable offline');
  let base = await baseResponse.clone().text();
  const patch = await patchResponse.clone().text();
  base = base.replace("const RUTA_VERSION = '1.2.0';", "const RUTA_VERSION = '1.3.2';");
  const marker = '  init();\n})();';
  if (!base.includes(marker)) throw new Error('RUTA cloud sync bundle marker was not found');
  const merged = base.replace(marker, `${patch}\n\n  init();\n})();`);
  const headers = new Headers(baseResponse.headers);
  headers.set('content-type','application/javascript; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(merged, {status:200, headers});
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin && url.pathname.endsWith('/cloud-sync.js')) {
    event.respondWith(unifiedCloudSync(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  if (url.origin === self.location.origin && (url.pathname.endsWith('.js') || url.pathname.endsWith('.html'))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => {
    const refresh = fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => cached);
    return cached || refresh;
  }));
});
