// Dirty Deeds offline helper. The page and the picture list come from the network when there is one (so updates
// show straight away) and from the phone's copy when there isn't. Pictures come from the phone's copy first and are
// refreshed in the background. Installing it downloads every picture once, so the whole game plays offline.
const CACHE = 'dirty-deeds-20261110154028';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'img/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    try {
      const names = await (await fetch('img/manifest.json', { cache: 'no-store' })).json();
      await Promise.allSettled(names.map(n => c.add(`img/${n}.jpg`)));
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const fresh = req.mode === 'navigate' || url.pathname.endsWith('.json') || url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (fresh) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try { const res = await fetch(req, { cache: 'no-store' }); if (res.ok) c.put(req.mode === 'navigate' ? 'index.html' : req, res.clone()); return res; }
      catch (err) { return (await c.match(req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true })) || Response.error(); }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(req, { ignoreSearch: true });
    const update = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await update) || Response.error();
  })());
});
