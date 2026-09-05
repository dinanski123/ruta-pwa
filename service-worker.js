const CACHE_NAME = 'ruta-cache-v2-safe-area';
const APP_SHELL = [
  './','./index.html','./manifest.json','./styles.css','./app-core.js','./app-ui.js','./app-nearby-forms.js','./app-main.js',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png','./icons/apple-touch-icon.png','./icons/favicon.png'
];
self.addEventListener('install',(event)=>{event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',(event)=>{event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((k)=>k!==CACHE_NAME).map((k)=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',(event)=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then((cached)=>{if(cached)return cached;return fetch(event.request).then((response)=>{const copy=response.clone();caches.open(CACHE_NAME).then((cache)=>cache.put(event.request,copy));return response;}).catch(()=>caches.match('./index.html'));}));});
