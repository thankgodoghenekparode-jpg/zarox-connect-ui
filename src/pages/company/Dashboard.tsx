import { useQuery } from '@tanstack/react-query'
import { Alert, Box, Card, CardContent, Grid, Typography } from '@mui/material'
import { useTenantStore } from '../../store/tenant'
import { branchesApi } from '../../api/branches'
import { staffApi } from '../../api/staff'

export function CompanyDashboardPage() {
  const tenant = useTenantStore((s) => s.current)
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() })

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
        <Stat label="Staff" value={staff.data?.length ?? '—'} />
        <Stat label="Plan" value={tenant?.plan?.name ?? '—'} />
      </Grid>
    </Box>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card variant="outlined">
        <CardContent>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  )
}
