import { api } from './client'

export interface PushRegisterInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

export const pushApi = {
  vapidPublicKey() {
    return api
      .get<{ publicKey: string | null }>('/push/vapid-public-key')
      .then((r) => r.data)
  },
  subscribe(input: PushRegisterInput) {
    return api.post<{ id: string; endpoint: string }>('/push/subscriptions', input).then((r) => r.data)
  },
  unsubscribe(endpoint: string) {
    return api.delete<{ removed: boolean }>('/push/subscriptions', { params: { endpoint } }).then((r) => r.data)
  },
}