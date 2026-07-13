/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => {
  void self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

interface PushPayload {
  title?: string
  body?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  try {
    payload = (event.data?.json() as PushPayload) ?? {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }
  event.waitUntil(
    (async () => {
      // If the app is already open and on-screen, the in-app banner + chime
      // handles it — showing a system notification too would be a duplicate.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (clients.some((c) => (c as WindowClient).visibilityState === 'visible')) return
      await self.registration.showNotification(payload.title ?? 'The Sho', {
        body: payload.body ?? '',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200],
      } as NotificationOptions)
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c)
      if (client) return (client as WindowClient).focus()
      return self.clients.openWindow('.')
    }),
  )
})
