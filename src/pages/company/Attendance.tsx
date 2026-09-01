import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import {
  attendanceApi,
  type AttendanceStatus,
} from '../../api/attendance'
import { branchesApi } from '../../api/branches'
import { staffApi } from '../../api/staff'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'

const STATUS_COLORS: Record<AttendanceStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ON_TIME: 'success',
  LATE: 'warning',
  EARLY_LEAVE: 'warning',
  OVERTIME: 'info',
  MISSED_CLOCK_IN: 'error',
  NO_CLOCK_OUT: 'error',
  ABSENT: 'default',
}

export function AttendancePage() {
  const qc = useQueryClient()
  const [branchId, setBranchId] = useState('')
  const [staffRecordId, setStaffRecordId] = useState('')
  const [status, setStatus] = useState('')
  const [clockDialog, setClockDialog] = useState<'in' | 'out' | null>(null)

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() })
  const records = useQuery({
    queryKey: ['attendance', branchId, staffRecordId, status],
    queryFn: () => attendanceApi.list({ branchId: branchId || undefined, staffRecordId: staffRecordId || undefined, status: (status as AttendanceStatus) || undefined }),
  })
  const summary = useQuery({
    queryKey: ['attendance-summary', branchId],
    queryFn: () => attendanceApi.summary({ branchId: branchId || undefined }),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['attendance'] })
    qc.invalidateQueries({ queryKey: ['attendance-summary'] })
  }

  const clock = useMutation({
    mutationFn: (kind: 'in' | 'out') =>
      kind === 'in' ? attendanceApi.clockIn({ latitude: 0, longitude: 0 }) : attendanceApi.clockOut({ latitude: 0, longitude: 0 }),
    onSuccess: () => { setClockDialog(null); invalidate() },
  })

  const rows = records.data ?? []
  const sum = summary.data

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Attendance</Typography>
        <Stack direction="row" spacing={1}>
          <Can permissions={['attendance.clock_in']}>
            <Button variant="contained" startIcon={<LoginIcon />} onClick={() => setClockDialog('in')}>Clock in</Button>
          </Can>
          <Can permissions={['attendance.clock_out']}>
            <Button variant="outlined" startIcon={<LogoutIcon />} onClick={() => setClockDialog('out')}>Clock out</Button>
          </Can>
        </Stack>
      </Stack>

      {clock.error && <Alert severity="error" sx={{ mb: 2 }}>{apiErrorMessage(clock.error)}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Stat label="Total" value={sum?.total ?? '—'} />
        <Stat label="Present" value={sum?.present ?? '—'} />
        {Object.entries(sum?.byStatus ?? {}).map(([k, v]) => (
          <Stat key={k} label={k.replaceAll('_', ' ')} value={v ?? 0} />
        ))}
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField select label="Branch" size="small" value={branchId} onChange={(e) => setBranchId(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">All branches</MenuItem>
          {(branches.data ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <Can permissions={['attendance.manage']}>
          <TextField select label="Staff" size="small" value={staffRecordId} onChange={(e) => setStaffRecordId(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">All staff</MenuItem>
            {(staff.data ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</MenuItem>
            ))}
          </TextField>
        </Can>
        <TextField select label="Status" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All statuses</MenuItem>
          {Object.keys(STATUS_COLORS).map((s) => <MenuItem key={s} value={s}>{s.replaceAll('_', ' ')}</MenuItem>)}
        </TextField>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Staff</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Clock in</TableCell>
              <TableCell>Clock out</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.user ? `${r.user.firstName} ${r.user.lastName}` : r.userId}</TableCell>
                <TableCell>{r.branch?.name ?? '—'}</TableCell>
                <TableCell>{formatDate(r.date)}</TableCell>
                <TableCell>{r.clockInAt ? formatTime(r.clockInAt) : '—'}</TableCell>
                <TableCell>{r.clockOutAt ? formatTime(r.clockOutAt) : '—'}</TableCell>
                <TableCell><Chip label={r.status.replaceAll('_', ' ')} size="small" color={STATUS_COLORS[r.status]} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No attendance records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={clockDialog !== null} onClose={() => setClockDialog(null)}>
        <DialogTitle>Clock {clockDialog === 'in' ? 'in' : 'out'}</DialogTitle>
        <DialogContent>
          {clockDialog === 'in'
            ? 'This will record your clock-in for today using your browser location (currently 0, 0). If a geofence is active, you may need to be near the branch.'
            : 'This records your clock-out for today.'}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClockDialog(null)}>Cancel</Button>
          <Button variant="contained" color={clockDialog === 'out' ? 'warning' : 'primary'} disabled={clock.isPending} onClick={() => clockDialog && clock.mutate(clockDialog)}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Grid item xs={6} sm={4} md={3}>
      <Card variant="outlined">
        <CardContent sx={{ py: 1.5 }}>
          <Typography color="text.secondary" variant="caption" textTransform="uppercase">{label}</Typography>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}