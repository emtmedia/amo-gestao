// public/sw-scan.js
// Service Worker para AMO Scan PWA
// Cacheia a shell da aplicação para acesso rápido

const CACHE_NAME = 'amo-scan-v1'
const SHELL_URLS = ['/scan']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
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
  const { request } = event

  // API calls: network only (nunca cachear dados dinâmicos)
  if (request.url.includes('/api/')) return

  // Navegação e assets: network first, fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request))
  )
})
