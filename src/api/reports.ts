import { api } from './client'

export interface AttendanceReport {
  summary: {
    totalRecords: number
    byStatus: Record<string, number>
    totalWorkHours: number
    presentDays: number
    absentDays: number
  }
  records: Array<{
    id: string
    date: string
    status: string
    clockInAt: string | null
    clockOutAt: string | null
    branchId: string | null
    branchName: string | null
    staffName: string | null
    jobTitle: string | null
  }>
}

export interface StaffReport {
  summary: {
    totalStaff: number
    active: number
    inactive: number
    byBranch: Record<string, number>
    byDepartment: Record<string, number>
  }
  records: Array<{
    id: string
    name: string
    email: string
    branchName: string | null
    department: string | null
    jobTitle: string | null
    employeeCode: string | null
    isActive: boolean
    joinedAt: string | null
  }>
}

export interface InventoryReport {
  summary: {
    totalItems: number
    lowStockItems: number
    byBranch: Record<string, number>
  }
  items: Array<{
    id: string
    sku: string | null
    name: string
    branchName: string | null
    quantity: number
    unit: string | null
    minQuantity: number
    location: string | null
    isLowStock: boolean
  }>
}

export const reportsApi = {
  attendance(query?: { from?: string; to?: string; branchId?: string; staffRecordId?: string }) {
    return api.get<AttendanceReport>('/reports/attendance', { params: query }).then((r) => r.data)
  },
  staff(query?: { branchId?: string; departmentId?: string }) {
    return api.get<StaffReport>('/reports/staff', { params: query }).then((r) => r.data)
  },
  inventory(query?: { branchId?: string; lowStock?: boolean }) {
    return api.get<InventoryReport>('/reports/inventory', { params: query }).then((r) => r.data)
  },
}

function reportDownloadUrl(kind: 'attendance' | 'staff' | 'inventory', query?: Record<string, unknown>): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
  const params = new URLSearchParams()
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    }
  }
  const qs = params.toString()
  return `${base}/reports/${kind}/export${qs ? `?${qs}` : ''}`
}

export function attendanceExportUrl(query?: { from?: string; to?: string; branchId?: string; staffRecordId?: string }) {
  return reportDownloadUrl('attendance', query)
}

export function staffExportUrl(query?: { branchId?: string; departmentId?: string }) {
  return reportDownloadUrl('staff', query)
}

export function inventoryExportUrl(query?: { branchId?: string; lowStock?: boolean }) {
  return reportDownloadUrl('inventory', query)
}