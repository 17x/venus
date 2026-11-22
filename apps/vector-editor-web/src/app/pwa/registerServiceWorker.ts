/** Registers the production app-shell worker while keeping development reloads deterministic. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', {scope: './'})
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const urls = performance.getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => new URL(url).origin === window.location.origin)

        registration.active?.postMessage({
          type: 'CACHE_URLS',
          urls: Array.from(new Set([window.location.href, ...urls])),
        })
      })
      .catch((error: unknown) => {
        console.error('Unable to register the offline app shell', error)
      })
  })
}
