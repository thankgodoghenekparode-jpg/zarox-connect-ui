import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
import LocationOnIcon from '@mui/icons-material/LocationOn'
import {
  attendanceApi,
  type AttendanceRecord,
  type AttendanceStatus,
} from '../../api/attendance'
import { branchesApi } from '../../api/branches'
import { staffApi } from '../../api/staff'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'
import { distanceMeters, getCurrentPosition, type GeoPosition, type GeoStatus } from '../../lib/geo'

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
  const [clockResult, setClockResult] = useState<AttendanceRecord | null>(null)
  const [clockKind, setClockKind] = useState<'in' | 'out' | null>(null)

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
    mutationFn: ({ kind, position }: { kind: 'in' | 'out'; position: GeoPosition }) =>
      kind === 'in'
        ? attendanceApi.clockIn({ latitude: position.latitude, longitude: position.longitude })
        : attendanceApi.clockOut({ latitude: position.latitude, longitude: position.longitude }),
    onSuccess: (data, vars) => {
      setClockDialog(null)
      setClockResult(data)
      setClockKind(vars.kind)
      invalidate()
    },
  })

  const rows = records.data ?? []
  const sum = summary.data

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={700}>Attendance</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Can permissions={['attendance.clock_in']}>
            <Button variant="contained" startIcon={<LoginIcon />} onClick={() => setClockDialog('in')}>Clock in</Button>
          </Can>
          <Can permissions={['attendance.clock_out']}>
            <Button variant="outlined" startIcon={<LogoutIcon />} onClick={() => setClockDialog('out')}>Clock out</Button>
          </Can>
        </Stack>
      </Stack>

      {clock.error && <Alert severity="error" sx={{ mb: 2 }}>{apiErrorMessage(clock.error)}</Alert>}
      {clockResult && clockKind && (
        <Alert severity={clockSeverity(clockResult, clockKind)} sx={{ mb: 2 }} onClose={() => setClockResult(null)}>
          {clockResultSummary(clockResult, clockKind)}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Stat label="Total" value={sum?.total ?? '—'} />
        <Stat label="Present" value={sum?.present ?? '—'} />
        {Object.entries(sum?.byStatus ?? {}).map(([k, v]) => (
          <Stat key={k} label={k.replaceAll('_', ' ')} value={v ?? 0} />
        ))}
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField select label="Branch" size="small" value={branchId} onChange={(e) => setBranchId(e.target.value)} sx={{ minWidth: 200, width: { xs: '100%', sm: 'auto' } }}>
          <MenuItem value="">All branches</MenuItem>
          {(branches.data ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <Can permissions={['attendance.manage']}>
          <TextField select label="Staff" size="small" value={staffRecordId} onChange={(e) => setStaffRecordId(e.target.value)} sx={{ minWidth: 220, width: { xs: '100%', sm: 'auto' } }}>
            <MenuItem value="">All staff</MenuItem>
            {(staff.data ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</MenuItem>
            ))}
          </TextField>
        </Can>
        <TextField select label="Status" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180, width: { xs: '100%', sm: 'auto' } }}>
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
                <TableCell>{r.clockInAt ? <TimeCell iso={r.clockInAt} caption={lateCaption(r.lateMinutes)} tone="error" /> : '—'}</TableCell>
                <TableCell>{r.clockOutAt ? <ClockOutCell iso={r.clockOutAt} record={r} /> : '—'}</TableCell>
                <TableCell><Chip label={r.status.replaceAll('_', ' ')} size="small" color={STATUS_COLORS[r.status]} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No attendance records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {clockDialog && (
        <ClockDialog
          kind={clockDialog}
          branches={branches.data ?? []}
          onCancel={() => setClockDialog(null)}
          onConfirm={(position) => clock.mutate({ kind: clockDialog, position })}
          busy={clock.isPending}
        />
      )}
    </Box>
  )
}

function ClockDialog({
  kind,
  branches,
  onCancel,
  onConfirm,
  busy,
}: {
  kind: 'in' | 'out'
  branches: Array<{ id: string; name: string; latitude: number; longitude: number; radiusMeters: number | null }>
  onCancel: () => void
  onConfirm: (position: GeoPosition) => void
  busy: boolean
}) {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [message, setMessage] = useState('')
  const [branchId, setBranchId] = useState('')
  const [error, setError] = useState('')

  const active = useRef(false)

  const refresh = async () => {
    active.current = true
    setGeoStatus('loading')
    setError('')
    setMessage('')
    const { position: pos, status } = await getCurrentPosition()
    if (!active.current) return
    setGeoStatus(status)
    if (pos) {
      setPosition(pos)
      setMessage(`Your current location: ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`)
    } else if (status === 'denied') {
      setError('Location permission was denied. Enable location access in your browser to clock in/out.')
    } else {
      setError('Unable to determine your location. Check that location services are enabled and try again.')
    }
  }

  const refBranch = branches.find((b) => b.id === branchId) ?? branches[0] ?? null
  const refLat = refBranch?.latitude ?? 5.564747
  const refLng = refBranch?.longitude ?? 5.815643
  const refRadius = refBranch?.radiusMeters ?? 200
  const within = position ? distanceMeters(refLat, refLng, position.latitude, position.longitude) <= refRadius : false

  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>Clock {kind === 'in' ? 'in' : 'out'}</DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={2} sx={{ pt: 1, minWidth: { xs: 'auto', sm: 320 } }}>
          <Alert severity="info">
            Your browser location will be used to verify you are at the branch.
            {geoStatus === 'loading' && ' Locating…'}
          </Alert>
          {branches.length > 0 && (
            <TextField select label="Check-in location" size="small" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <MenuItem value=""><em>Default (company HQ)</em></MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
          )}
          {position && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <LocationOnIcon color={within ? 'success' : 'error'} />
              <Typography variant="body2" color="text.secondary">
                {message} · {Math.round(distanceMeters(refLat, refLng, position.latitude, position.longitude))}m from {refBranch?.name ?? 'company HQ'}
              </Typography>
            </Stack>
          )}
          {!position && geoStatus !== 'loading' && (
            <Typography variant="body2" color="text.secondary">
              Location not captured yet. Tap “Use my location”.
            </Typography>
          )}
          {error && <Alert severity="warning">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 }, flexWrap: 'wrap' }}>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button onClick={() => void refresh()} disabled={busy || geoStatus === 'loading'}>
          {geoStatus === 'loading' ? <CircularProgress size={18} /> : 'Use my location'}
        </Button>
        <Button
          variant="contained"
          color={kind === 'out' ? 'warning' : 'primary'}
          disabled={busy || !position || !within}
          onClick={() => position && onConfirm(position)}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
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

function lateCaption(lateMinutes: number | null): string | null {
  if (lateMinutes == null || lateMinutes <= 0) return null
  return `${lateMinutes} min late`
}

type CaptionTone = 'error' | 'warning' | 'info'

function clockOutCaption(r: AttendanceRecord): { text: string; tone: CaptionTone } | null {
  if (r.status === 'EARLY_LEAVE' && r.earlyLeaveMinutes != null) {
    return { text: `${r.earlyLeaveMinutes} min early`, tone: 'warning' }
  }
  if (r.status === 'OVERTIME' && r.overtimeMinutes != null) {
    return { text: `${r.overtimeMinutes} min overtime`, tone: 'info' }
  }
  return null
}

function TimeCell({ iso, caption, tone }: { iso: string; caption: string | null; tone: CaptionTone | null }) {
  return (
    <Stack>
      <span>{formatTime(iso)}</span>
      {caption && tone && (
        <Typography variant="caption" fontWeight={700} sx={{ color: (t) => t.palette[tone].main }}>
          {caption}
        </Typography>
      )}
    </Stack>
  )
}

function ClockOutCell({ iso, record }: { iso: string; record: AttendanceRecord }) {
  const caption = clockOutCaption(record)
  return <TimeCell iso={iso} caption={caption?.text ?? null} tone={caption?.tone ?? null} />
}

function clockResultSummary(r: AttendanceRecord, kind: 'in' | 'out'): string {
  if (kind === 'in') {
    if (r.status === 'LATE' && r.lateMinutes != null) return `Clocked in — ${r.lateMinutes} min late`
    return 'Clocked in — on time'
  }
  if (r.status === 'EARLY_LEAVE' && r.earlyLeaveMinutes != null) {
    return `Clocked out — left ${r.earlyLeaveMinutes} min early`
  }
  if (r.status === 'OVERTIME' && r.overtimeMinutes != null) {
    return `Clocked out — ${r.overtimeMinutes} min overtime`
  }
  return 'Clocked out — on time'
}

function clockSeverity(r: AttendanceRecord, kind: 'in' | 'out'): 'success' | 'info' | 'warning' {
  if (kind === 'in' && r.status === 'LATE') return 'warning'
  if (kind === 'out' && r.status === 'EARLY_LEAVE') return 'warning'
  if (kind === 'out' && r.status === 'OVERTIME') return 'info'
  return 'success'
}
