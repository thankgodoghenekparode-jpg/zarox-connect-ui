import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import GridOnIcon from '@mui/icons-material/GridOn'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import { reportsApi, attendanceExportUrl, staffExportUrl, inventoryExportUrl } from '../../api/reports'
import { branchesApi } from '../../api/branches'
import { departmentsApi } from '../../api/departments'
import { Can } from '../../components/PermissionGate'

type ReportKind = 'attendance' | 'staff' | 'inventory'

export function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>('attendance')
  const [branchFilter, setBranchFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list() })

  const attendance = useQuery({
    queryKey: ['report-attendance', branchFilter, from, to],
    queryFn: () => reportsApi.attendance({ branchId: branchFilter || undefined, from: from || undefined, to: to || undefined }),
    enabled: kind === 'attendance',
  })
  const staff = useQuery({
    queryKey: ['report-staff', branchFilter, deptFilter],
    queryFn: () => reportsApi.staff({ branchId: branchFilter || undefined, departmentId: deptFilter || undefined }),
    enabled: kind === 'staff',
  })
  const inventory = useQuery({
    queryKey: ['report-inventory', branchFilter],
    queryFn: () => reportsApi.inventory({ branchId: branchFilter || undefined }),
    enabled: kind === 'inventory',
  })

  const downloadUrl = kind === 'attendance'
    ? attendanceExportUrl({ branchId: branchFilter || undefined, from: from || undefined, to: to || undefined })
    : kind === 'staff'
      ? staffExportUrl({ branchId: branchFilter || undefined, departmentId: deptFilter || undefined })
      : inventoryExportUrl({ branchId: branchFilter || undefined })

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Reports</Typography>
        <Can permissions={['report.export']}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={kind === 'attendance' && attendance.isLoading || kind === 'staff' && staff.isLoading || kind === 'inventory' && inventory.isLoading}
            href={downloadUrl}
            download
          >
            Export CSV
          </Button>
        </Can>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField select label="Report" value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} size="small" sx={{ minWidth: 200 }}>
          <MenuItem value="attendance">Attendance</MenuItem>
          <MenuItem value="staff">Staff</MenuItem>
          <MenuItem value="inventory">Inventory</MenuItem>
        </TextField>
        <TextField select label="Branch" size="small" value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setDeptFilter('') }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All branches</MenuItem>
          {(branches.data ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        {kind === 'staff' && (
          <TextField select label="Department" size="small" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">All departments</MenuItem>
            {(departments.data ?? []).map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </TextField>
        )}
        {kind === 'attendance' && (
          <>
            <TextField label="From" type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="To" type="date" size="small" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          </>
        )}
      </Stack>

      {attendance.isError && <Alert severity="error" sx={{ mb: 2 }}>{attendance.error.message}</Alert>}

      {kind === 'attendance' && attendance.data && <AttendanceReport cards={attendance.data.summary} rows={attendance.data.records} />}
      {kind === 'staff' && staff.data && <StaffReport cards={staff.data.summary} rows={staff.data.records} />}
      {kind === 'inventory' && inventory.data && <InventoryReport cards={inventory.data.summary} rows={inventory.data.items} />}
    </Box>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

function AttendanceReport({ cards, rows }: { cards: { totalRecords: number; presentDays: number; absentDays: number; totalWorkHours: number }; rows: Array<{ id: string; date: string; status: string; staffName: string | null; branchName: string | null; clockInAt: string | null; clockOutAt: string | null }> }) {
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <StatCard icon={<GridOnIcon />} label="Records" value={cards.totalRecords} />
        <StatCard icon={<GridOnIcon />} label="Present days" value={cards.presentDays} />
        <StatCard icon={<GridOnIcon />} label="Absent days" value={cards.absentDays} />
        <StatCard icon={<GridOnIcon />} label="Total hours" value={Math.round(cards.totalWorkHours * 10) / 10} />
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Clock in</TableCell>
              <TableCell>Clock out</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                <TableCell>{r.staffName ?? '—'}</TableCell>
                <TableCell>{r.branchName ?? '—'}</TableCell>
                <TableCell>{r.clockInAt ? new Date(r.clockInAt).toLocaleTimeString() : '—'}</TableCell>
                <TableCell>{r.clockOutAt ? new Date(r.clockOutAt).toLocaleTimeString() : '—'}</TableCell>
                <TableCell><Chip label={r.status} size="small" color={r.status === 'PRESENT' ? 'success' : r.status === 'ABSENT' ? 'error' : 'default'} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

function StaffReport({ cards, rows }: { cards: { totalStaff: number; active: number; inactive: number; byBranch: Record<string, number>; byDepartment: Record<string, number> }; rows: Array<{ id: string; name: string; email: string; branchName: string | null; department: string | null; jobTitle: string | null; employeeCode: string | null; isActive: boolean; joinedAt: string | null }> }) {
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <StatCard icon={<GridOnIcon />} label="Total staff" value={cards.totalStaff} />
        <StatCard icon={<GridOnIcon />} label="Active" value={cards.active} />
        <StatCard icon={<GridOnIcon />} label="Inactive" value={cards.inactive} />
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Job title</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.branchName ?? '—'}</TableCell>
                <TableCell>{r.department ?? '—'}</TableCell>
                <TableCell>{r.jobTitle ?? '—'}</TableCell>
                <TableCell><Chip label={r.isActive ? 'Active' : 'Inactive'} size="small" color={r.isActive ? 'success' : 'default'} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

function InventoryReport({ cards, rows }: { cards: { totalItems: number; lowStockItems: number; byBranch: Record<string, number> }; rows: Array<{ id: string; sku: string | null; name: string; branchName: string | null; quantity: number; unit: string | null; minQuantity: number; location: string | null; isLowStock: boolean }> }) {
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <StatCard icon={<Inventory2Icon />} label="Total items" value={cards.totalItems} />
        <StatCard icon={<Inventory2Icon />} label="Low stock" value={cards.lowStockItems} />
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Min</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.sku ?? '—'}</TableCell>
                <TableCell>{r.branchName ?? '—'}</TableCell>
                <TableCell>{r.quantity} {r.unit ?? ''}</TableCell>
                <TableCell>{r.minQuantity}</TableCell>
                <TableCell><Chip label={r.isLowStock ? 'Low stock' : 'In stock'} size="small" color={r.isLowStock ? 'error' : 'success'} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No items</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}