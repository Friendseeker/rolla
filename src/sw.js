const cacheName = 'rolla-static'
const staticAssets = [
  '/index.html',
  '/main.css',
  '/app.js',
  '/manifest.webmanifest'
]

self.addEventListener('install', async (event) => {
  const cache = await caches.open(cacheName)
  await cache.addAll(staticAssets)
  return self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  event.respondWith(networkFirst(event.request))
})

async function networkFirst (req) {
  const cache = await caches.open(cacheName)
  try {
    const fresh = await fetch(req)
    await cache.put(req, fresh.clone())
    return fresh
  } catch {
    return cache.match(req)
  }
}
