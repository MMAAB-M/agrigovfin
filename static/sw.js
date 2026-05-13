/* ═══════════════════════════════════════════
   AgriGov PWA — Service Worker v1.1
   Cache-first pour assets, network-first pour API
   ═══════════════════════════════════════════ */
const CACHE_NAME = 'agrigov-v2';
const STATIC_ASSETS = [
  '/',
  '/static/css/home.css',
  '/static/css/creecompte.css',
  '/static/css/se%20connecter.css',
  '/static/css/agricultur.css',
  '/static/css/achateur.css',
  '/static/css/transpo-advanced.css',
  '/static/css/admin.css',
  '/static/css/veterinaire.css',
  '/static/css/contact.css',
  '/static/css/service.css',
  '/static/css/ensavoir.css',
  '/static/js/home.js',
  '/static/js/agrigov-chatbot.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/static/manifest.json',
];

/* Install — cache les assets statiques */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

/* Activate — supprime les anciens caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch — stratégie adaptative */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls → network first, fallback cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/livraison/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets → cache first, fallback network
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML pages → network first, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        return cached || new Response(
          '<html><body style="font-family:system-ui;text-align:center;padding:60px 20px;background:#f8faf8">' +
          '<h1 style="color:#2d7a2d">🌿 AgriGov</h1>' +
          '<p style="color:#666">Vous êtes hors ligne.<br>Vérifiez votre connexion Internet.</p>' +
          '<button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#2d7a2d;color:#fff;border:none;border-radius:10px;font-size:1rem;cursor:pointer">Réessayer</button>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }))
  );
});
