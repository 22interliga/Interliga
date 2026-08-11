// Interliga — Service Worker
// Estratégia NETWORK-FIRST: sempre tenta baixar a versão nova da rede e atualiza
// o cache. Só usa o cache como reserva quando o aparelho está offline.
// (Antes era "cache-first" com nome 'setubal-v1', que servia a versão velha pra
//  sempre — por isso era preciso "limpar dados" a cada atualização. Resolvido.)

const CACHE = 'interliga-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        // Guarda no cache só os arquivos do próprio site que vieram OK,
        // pra servir de reserva quando estiver offline.
        if (resp && resp.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
