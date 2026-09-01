import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useTenantStore } from '../../store/tenant'
import { branchesApi } from '../../api/branches'
import { staffApi } from '../../api/staff'
import { departmentsApi } from '../../api/departments'
import { inventoryApi } from '../../api/inventory'
import { reportsApi } from '../../api/reports'
import { notificationsApi } from '../../api/chat'
import { workflowsApi } from '../../api/workflows'

export function CompanyDashboardPage() {
  const tenant = useTenantStore((s) => s.current)
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() })
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list() })
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.list() })
  const attendance = useQuery({ queryKey: ['report-attendance-dash'], queryFn: () => reportsApi.attendance() })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.list(5) })
  const approvals = useQuery({ queryKey: ['wf-approvals'], queryFn: () => workflowsApi.approvals() })

  const staffData = staff.data ?? []
  const lowStock = (inventory.data ?? []).filter((i) => i.quantity <= i.minQuantity)

  return (
    <Box>
      {tenant?.onboardingStatus && tenant.onboardingStatus !== 'COMPLETED' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Onboarding in progress (stage: {tenant.onboardingStatus}).
        </Alert>
      )}
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {tenant?.name ?? 'Company'} Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Stat label="Branches" value={branches.data?.length ?? '—'} />
        <Stat label="Staff" value={staffData.length} sub={`${staffData.filter((s) => s.isActive).length} active`} />
        <Stat label="Departments" value={departments.data?.length ?? '—'} />
        <Stat label="Low stock items" value={lowStock.length} warn={lowStock.length > 0} />
        <Stat label="Pending approvals" value={approvals.data?.length ?? '—'} />
        <Stat label="Plan" value={tenant?.plan?.name ?? '—'} />
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>Recent staff</Typography>
                <Link component={RouterLink} to="/app/staff" variant="body2">View all</Link>
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell>Role</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staffData.slice(0, 6).map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell>{s.user.firstName} {s.user.lastName}</TableCell>
                        <TableCell>{s.branch?.name ?? '—'}</TableCell>
                        <TableCell>{s.roles.map((r) => r.name).join(', ') || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {staffData.length === 0 && (
                      <TableRow><TableCell colSpan={3} align="center">No staff yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Attendance today
              </Typography>
              {attendance.data && attendance.data.summary.totalRecords > 0 ? (
                <Stack direction="row" spacing={3}>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>{attendance.data.summary.presentDays}</Typography>
                    <Typography variant="body2" color="text.secondary">Present</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>{attendance.data.summary.absentDays}</Typography>
                    <Typography variant="body2" color="text.secondary">Absent</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>{Math.round(attendance.data.summary.totalWorkHours * 10) / 10}h</Typography>
                    <Typography variant="body2" color="text.secondary">Worked</Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No records yet.</Typography>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Notifications</Typography>
              {(notifications.data ?? []).slice(0, 4).map((n) => (
                <Box key={n.id} sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {!n.readAt && <Chip label="New" size="small" color="primary" />}
                    <Typography variant="body2" color="text.secondary">{n.body ?? n.title}</Typography>
                  </Stack>
                </Box>
              ))}
              {(notifications.data ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">No notifications.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

function Stat({ label, value, sub, warn }: { label: string; value: number | string; sub?: string; warn?: boolean }) {
  return (
    <Grid item xs={12} sm={6} md={4} lg={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography color={warn ? 'error.main' : 'text.secondary'} variant="body2">{label}</Typography>
          <Typography variant="h4" fontWeight={700} color={warn ? 'error.main' : undefined}>{value}</Typography>
          {sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}
        </CardContent>
      </Card>
    </Grid>
  )
}