import type { DataAdapter } from '../adapters/DataAdapter'
import type { LocationId } from './types'
import { getConfig, isDemo } from './config'

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export type PushResult = 'granted' | 'denied' | 'unsupported' | 'local-only'

/**
 * Ask for notification permission and, in live mode, register a Web Push
 * subscription with the backend so the server can ping this device even
 * when the app is closed.
 */
export async function enableNotifications(
  adapter: DataAdapter,
  deviceId: string,
  side: LocationId,
  ownerName: string,
): Promise<PushResult> {
  if (!('Notification' in window)) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const cfg = getConfig()
  if (isDemo() || !cfg.vapidPublicKey || !('serviceWorker' in navigator)) {
    return 'local-only'
  }
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(cfg.vapidPublicKey) as BufferSource,
    })
    await adapter.savePushSubscription({
      deviceId,
      subscription: subscription.toJSON(),
      side,
      ownerName,
    })
    return 'granted'
  } catch (e) {
    console.warn('push subscribe failed', e)
    return 'local-only'
  }
}

export function isIosSafariNotInstalled(): boolean {
  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/.test(ua)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return isIos && !standalone
}
