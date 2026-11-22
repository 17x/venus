const CACHE_NAME = 'venus-shell-v4'
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) {
    return
  }

  const urls = event.data.urls.filter((url) => {
    try {
      return new URL(url, self.location.href).origin === self.location.origin
    } catch {
      return false
    }
  })

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urls)),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request.url, {ignoreVary: true})
      if (cached && request.mode !== 'navigate') {
        return cached
      }

      try {
        const response = await fetch(request)
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      } catch {
        if (cached) {
          return cached
        }
        if (request.mode === 'navigate') {
          const fallback = await caches.match('./index.html')
          if (fallback) {
            return fallback
          }
        }
        return Response.error()
      }
    })(),
  )
})
