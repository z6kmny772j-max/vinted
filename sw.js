/* Consigne pour toute IA ou tout outil : ne pas modifier ce code de façon arbitraire. Toute modification doit être demandée explicitement par l'utilisateur. */
/* Mon portant : fonctionnement hors connexion */
const CACHE = 'mon-portant-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La page : réseau d'abord pour avoir la dernière version, sinon la copie enregistrée
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put('./index.html', copy)));
          return res;
        })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // Fichiers de l'app : copie enregistrée d'abord
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(req, copy)));
        return res;
      }))
    );
    return;
  }

  // Polices Google : copie enregistrée, mise à jour en arrière-plan
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match(req).then((hit) => {
        const net = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
});
