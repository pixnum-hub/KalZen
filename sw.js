// ╔══════════════════════════════════════════════════════════════╗
// ║  Kalzen PWA — Service Worker v4.0                           ║
// ║  Updated: 2026 — includes Help Guide + First Draw Guide     ║
// ║  © Manik Roy 2026. All Rights Reserved.                     ║
// ╚══════════════════════════════════════════════════════════════╝
'use strict';

const CACHE_NAME = 'kalzen-v4';

// ── App shell: pre-cached on install for instant offline load ─
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-192m.png',
  './icons/icon-512.png',
  './icons/icon-512m.png',
  './icons/icon-96.png',
  './icons/icon-72.png',
  './icons/favicon.ico',
];

// ── Install: cache app shell, skip waiting immediately ────────
self.addEventListener('install', e => {
  console.log('[Kalzen SW v4] Installing…');
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .catch(err => console.warn('[Kalzen SW v4] Pre-cache failed (normal on file://):', err.message))
  );
});

// ── Activate: delete all old cache versions ───────────────────
self.addEventListener('activate', e => {
  console.log('[Kalzen SW v4] Activating…');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[Kalzen SW v4] Removing old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => {
        console.log('[Kalzen SW v4] Active. Cache:', CACHE_NAME);
        return self.clients.claim();
      })
  );
});

// ── Fetch: three-tier strategy ────────────────────────────────
//   HTML + manifest  →  Network-first  (always get latest app)
//   Fonts (Google)   →  Cache-first    (long TTL, rarely change)
//   Everything else  →  Cache-first    (icons, assets, fast load)
self.addEventListener('fetch', e => {
  // Only handle HTTP/HTTPS GET requests
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  const url       = new URL(e.request.url);
  const isHTML    = e.request.headers.get('accept')?.includes('text/html');
  const isManifest= url.pathname.endsWith('manifest.json');
  const isFont    = url.hostname.includes('fonts.googleapis.com')
                 || url.hostname.includes('fonts.gstatic.com');

  if (isHTML || isManifest) {
    // ── Network-first: always try to get the freshest app ───
    e.respondWith(
      fetch(e.request.clone())
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request)
            .then(c => c || offlinePage())
        )
    );

  } else if (isFont) {
    // ── Cache-first for fonts: fast load, cache on first use ─
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request.clone()).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );

  } else {
    // ── Cache-first for all other assets (icons, images…) ───
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request.clone()).then(res => {
          // Cache successful, non-opaque GET responses
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

// ── Message: skip waiting when a new version is ready ────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    console.log('[Kalzen SW v4] Applying update…');
    self.skipWaiting();
  }
});

// ── Styled offline fallback page ─────────────────────────────
function offlinePage() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Kalzen — Offline</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      background:#111318;color:#e4e7f0;
      font-family:'DM Mono',monospace,sans-serif;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      min-height:100dvh;gap:20px;
      text-align:center;padding:32px;
      background-image:radial-gradient(ellipse at 50% 0%,
        rgba(124,106,247,.15) 0%,transparent 60%);
    }
    .logo{
      font-size:2.8rem;font-weight:700;
      letter-spacing:-.02em;font-family:Georgia,serif;
    }
    .logo span{color:#7c6af7}
    .badge{
      background:rgba(255,71,87,.12);
      border:1px solid rgba(255,71,87,.35);
      color:#ff4757;border-radius:999px;
      padding:5px 18px;font-size:11px;font-weight:600;
      letter-spacing:.06em;
      display:flex;align-items:center;gap:8px;
    }
    .dot{
      width:7px;height:7px;border-radius:50%;
      background:#ff4757;flex-shrink:0;
      animation:pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
    p{font-size:.875rem;color:#7a8099;max-width:300px;line-height:1.6}
    button{
      background:#7c6af7;color:#fff;border:none;
      border-radius:10px;padding:12px 28px;
      font-family:inherit;font-size:.875rem;
      font-weight:600;cursor:pointer;
      transition:opacity .15s;margin-top:4px;
    }
    button:hover{opacity:.85}
    .sub{font-size:.75rem;color:#3a3f52;margin-top:4px}
  </style>
</head>
<body>
  <div class="logo">Kal<span>z</span>en</div>
  <div class="badge"><span class="dot"></span> You're offline</div>
  <p>Reconnect to the internet to load Kalzen. Your artwork stays safe on your device.</p>
  <button onclick="location.reload()">Try Again</button>
  <div class="sub">© Manik Roy 2026</div>
</body>
</html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
