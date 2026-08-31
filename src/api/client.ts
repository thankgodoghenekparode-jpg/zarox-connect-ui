import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

/** Value stored in localStorage for the active tenant context (companion to the x-tenant-id header). */
const TENANT_ID_KEY = 'zarox:tenantId'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

let accessToken: string | null = null

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/** Set once after login/refresh so that API calls that need a bearer fallback can use it. */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getTenantId(): string | null {
  return localStorage.getItem(TENANT_ID_KEY)
}

export function setTenantId(id: string | null): void {
  if (id) localStorage.setItem(TENANT_ID_KEY, id)
  else localStorage.removeItem(TENANT_ID_KEY)
}

// Attach the active tenant id to every request (unless it is a tenant-agnostic route).
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tenantId = getTenantId()
  if (tenantId) config.headers.set('x-tenant-id', tenantId)
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
  return config
})

// Retry once on 401 to refresh cookies, then let the caller handle failure.
let refreshPromise: Promise<void> | null = null

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<{ user: AuthUser | null }>('/auth/refresh')
      .then((res) => {
        setAccessToken(null)
        return res.data.user ?? null
      })
      .then((user) => {
        // treat a null user as an expired session
        if (!user) throw new AxiosError('Session expired', 'session')
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined
    const status = error.response?.status
    const url = original?.url ?? ''

    // Never retry auth-related endpoints in this loop (guards against recursion).
    const isAuthUrl =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')

    if (status === 401 && original && !original._retry && !isAuthUrl) {
      original._retry = true
      try {
        await refreshSession()
        return api(original)
      } catch {
        setAccessToken(null)
        throw error
      }
    }
    throw error
  },
)

/** Extract a human-friendly error message from an axios error response. */
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] : data.message
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred'
}

/* ---------------------------------- types ---------------------------------- */

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'SUPER_ADMIN' | 'PLATFORM_SUPPORT' | 'COMPANY_ADMIN' | 'BRANCH_ADMIN' | 'USER'
  avatarUrl: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TenantMembership {
  id: string
  name: string
  slug: string
  status: string
  onboardingStatus: string
  plan: { code: string; name: string } | null
}

export interface StaffRole {
  id: string
  name: string
  isSystem: boolean
  branchId: string | null
}

export interface CurrentTenant {
  id: string
  name: string
  slug: string
  status: string
  onboardingStatus: string
  timezone: string
  plan: {
    code: string
    name: string
    maxBranches: number | null
    maxStaff: number | null
  }
  permissions: string[]
  isCompanyAdmin: boolean
  roles: Array<StaffRole & { permissions: string[] }>
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}
