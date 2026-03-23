// ╔══════════════════════════════════════════════════════════════╗
// ║  Kalzen PWA — Service Worker v2.0                           ║
// ║  © Manik Roy 2026. All Rights Reserved.                     ║
// ╚══════════════════════════════════════════════════════════════╝
'use strict';

const CACHE_NAME = 'kalzen-v2';
const APP_SHELL  = ['./'];

// ── Install: pre-cache app shell ─────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => { /* file:// origin — caching skipped */ })
  );
});

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first with network fallback ─────────────────
self.addEventListener('fetch', e => {
  // Only intercept http/https
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request.clone()).then(response => {
        // Cache successful GET responses
        if (
          e.request.method === 'GET' &&
          response.status === 200 &&
          response.type !== 'opaque'
        ) {
          const toCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(e.request, toCache));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('./').then(fallback => fallback || new Response(
          `<!DOCTYPE html><html><head><meta charset="UTF-8">
           <meta name="viewport" content="width=device-width,initial-scale=1">
           <title>Kalzen — Offline</title>
           <style>
             body{background:#111318;color:#e4e7f0;font-family:'DM Mono',monospace;
               display:flex;flex-direction:column;align-items:center;justify-content:center;
               min-height:100vh;margin:0;gap:16px;text-align:center;padding:24px}
             h1{font-size:2rem;color:#7c6af7;margin:0}
             p{color:#7a8099;font-size:.9rem;max-width:320px}
             button{background:#7c6af7;color:#fff;border:none;border-radius:8px;
               padding:10px 24px;font-family:inherit;font-size:.9rem;cursor:pointer}
           </style></head>
           <body>
             <h1>Kal<span style="color:#fff">z</span>en</h1>
             <p>You appear to be offline. Connect to the internet to load Kalzen.</p>
             <button onclick="location.reload()">Try Again</button>
           </body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        ));
      });
    })
  );
});

// ── Message: skip waiting on demand ──────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
