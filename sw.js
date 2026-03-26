// ╔══════════════════════════════════════════════════════════════╗
// ║  Kalzen PWA — Service Worker v2.1                           ║
// ║  © Manik Roy 2026. All Rights Reserved.                     ║
// ╚══════════════════════════════════════════════════════════════╝
'use strict';

const CACHE_NAME = 'kalzen-v2.1';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192m.png',
  './icons/icon-512m.png',
];

// ── Install: pre-cache app shell ─────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE).catch(() => {})
    )
  );
});

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[Kalzen SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: stale-while-revalidate for HTML, cache-first for assets ──
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  const isHTML = e.request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    // Network first for HTML → fall back to cache
    e.respondWith(
      fetch(e.request.clone())
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || offlinePage()))
    );
  } else {
    // Cache first for assets (icons, fonts, etc.)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request.clone()).then(res => {
          if (res.ok && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => offlinePage());
      })
    );
  }
});

// ── Message: skip waiting on new version ─────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Offline fallback page ─────────────────────────────────────
function offlinePage() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Kalzen — Offline</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#111318;color:#e4e7f0;font-family:'DM Mono',monospace,sans-serif;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:100dvh;gap:20px;text-align:center;padding:32px;
      background-image:radial-gradient(ellipse at 50% 0%,rgba(124,106,247,.15) 0%,transparent 60%)}
    .logo{font-size:3rem;font-weight:700;letter-spacing:-.02em}
    .logo span{color:#7c6af7}
    h2{font-size:1.1rem;color:#7a8099;font-weight:400}
    p{font-size:.875rem;color:#7a8099;max-width:300px;line-height:1.6}
    button{background:#7c6af7;color:#fff;border:none;border-radius:10px;
      padding:12px 28px;font-family:inherit;font-size:.9rem;font-weight:600;
      cursor:pointer;margin-top:8px;transition:opacity .15s}
    button:hover{opacity:.85}
    .dot{width:8px;height:8px;border-radius:50%;background:#ff4757;
      display:inline-block;margin-right:6px;animation:pulse 1.5s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  </style>
</head>
<body>
  <div class="logo">Kal<span>z</span>en</div>
  <h2><span class="dot"></span>You're offline</h2>
  <p>Connect to the internet to load Kalzen. Your saved artwork is still safe on your device.</p>
  <button onclick="location.reload()">Try Again</button>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
