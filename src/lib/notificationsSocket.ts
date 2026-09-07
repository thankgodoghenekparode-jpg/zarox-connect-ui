import { io, type Socket } from 'socket.io-client'
import { getAccessToken, getAccessTokenCookie, getTenantId } from '../api/client'

let socket: Socket | null = null
const listeners = new Set<(event: string, payload: unknown) => void>()

/** Websocket origin: strip the /api/v1 prefix, fall back to the current origin in dev. */
function socketOrigin(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
  const origin = base.replace(/\/api\/v1\/?$/, '')
  return origin || window.location.origin
}

export function subscribeNotifications(
  handler: (event: string, payload: unknown) => void,
): () => void {
  listeners.add(handler)
  return () => {
    listeners.delete(handler)
  }
}

/** Connect (once) to the realtime gateway. Best-effort: polling is the fallback. */
export function connectNotificationsSocket(): void {
  if (socket) return
  try {
    const tenantId = getTenantId()
    const token = getAccessToken() ?? getAccessTokenCookie()
    if (!tenantId || !token) return
    socket = io(socketOrigin(), {
      transports: ['websocket', 'polling'],
      auth: { token, tenantId },
    })
    socket.on('notification:new', (payload: unknown) => {
      for (const l of listeners) l('notification:new', payload)
    })
    socket.on('connect_error', () => {
      // Realtime is optional; keep polling as the source of truth.
    })
  } catch {
    socket = null
  }
}

export function disconnectNotificationsSocket(): void {
  socket?.disconnect()
  socket = null
}