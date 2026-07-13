export interface Banner {
  id: string
  title: string
  body: string
  tone: 'info' | 'success' | 'warning'
}

type Listener = (banners: Banner[]) => void

let banners: Banner[] = []
const listeners = new Set<Listener>()

export function pushBanner(title: string, body: string, tone: Banner['tone'] = 'info') {
  const banner: Banner = { id: crypto.randomUUID(), title, body, tone }
  banners = [...banners, banner]
  for (const l of listeners) l(banners)
  setTimeout(() => dismissBanner(banner.id), 6000)
}

export function dismissBanner(id: string) {
  banners = banners.filter((b) => b.id !== id)
  for (const l of listeners) l(banners)
}

export function subscribeBanners(l: Listener): () => void {
  listeners.add(l)
  l(banners)
  return () => {
    listeners.delete(l)
  }
}

/** Also raise a system notification when the app has permission. */
export function notifyLocal(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: 'icons/icon-192.png' })
    } catch {
      // Some platforms (Android Chrome) require SW notifications; banner covers it.
    }
  }
}
