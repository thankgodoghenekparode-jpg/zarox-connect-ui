import { api } from './client'

export interface TenantSettings {
  defaultLatitude?: number
  defaultLongitude?: number
  defaultRadiusMeters?: number
  frontendUrl?: string
  apiUrl?: string
}

export const settingsApi = {
  get() {
    return api.get<TenantSettings>('/settings').then((r) => r.data)
  },
  update(body: Partial<TenantSettings>) {
    return api.put<TenantSettings>('/settings', body).then((r) => r.data)
  },
}