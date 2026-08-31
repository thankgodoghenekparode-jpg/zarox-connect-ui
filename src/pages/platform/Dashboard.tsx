import { useQuery } from '@tanstack/react-query'
import { Box, Card, CardContent, Grid, Typography } from '@mui/material'
import { platformApi } from '../../api/platform'

export function PlatformDashboardPage() {
  const tenants = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformApi.tenants({ limit: 100 }),
  })
  const users = useQuery({
    queryKey: ['platform', 'users'],
    queryFn: () => platformApi.users({ limit: 100 }),
  })

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Platform Overview
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Tenants" value={tenants.data?.total ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Platform users" value={users.data?.total ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Active tenants"
            value={tenants.data?.items.filter((t) => t.status === 'ACTIVE').length ?? '—'}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}
