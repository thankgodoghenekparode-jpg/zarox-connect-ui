import { pushApi, type PushRegisterInput } from '../api/push'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function toRegisterInput(subscription: PushSubscription): PushRegisterInput {
  const keyOf = (name: 'auth' | 'p256dh') => {
    const key = subscription.getKey(name)
    return key ? btoa(String.fromCharCode(...new Uint8Array(key))) : ''
  }
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: keyOf('p256dh'), auth: keyOf('auth') },
    userAgent: navigator.userAgent,
  }
}

export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return Boolean(subscription)
}

export async function enablePushNotifications(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'unsupported' }
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, error: permission }

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return { ok: false, error: 'not-installed' }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const { publicKey } = await pushApi.vapidPublicKey()
      if (!publicKey) return { ok: false, error: 'not-configured' }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    await pushApi.subscribe(toRegisterInput(subscription))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown' }
  }
}

export async function disablePushNotifications(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: true }
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        try {
          await pushApi.unsubscribe(subscription.endpoint)
        } catch {
          // best-effort server cleanup
        }
        await subscription.unsubscribe()
      }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown' }
  }
}