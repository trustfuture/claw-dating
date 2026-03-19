const CACHE_NAME = 'claw-dating-v1'
const STATIC_ASSETS = [
  '/',
  '/lobby',
  '/dates',
  '/scoreboard',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/offline.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and chrome-extension
  if (event.request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return

  // Stale-while-revalidate for read-only API endpoints
  const SWR_API_PATHS = ['/api/agents', '/api/events', '/api/agents/stats', '/api/events/history', '/api/stats']
  if (url.pathname.startsWith('/api/') && SWR_API_PATHS.some((p) => url.pathname === p)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        return cached || fetchPromise
      })
    )
    return
  }

  // Skip other API calls
  if (url.pathname.startsWith('/api/')) return

  // Network-first for HTML pages (always try fresh)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/offline.html')))
    )
    return
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.ok && url.pathname.startsWith('/_next/')) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
