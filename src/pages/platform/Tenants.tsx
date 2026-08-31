import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import { platformApi, type PlatformTenant } from '../../api/platform'
import { apiErrorMessage } from '../../api/client'

export function TenantsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [confirm, setConfirm] = useState<{ tenant: PlatformTenant; action: 'suspend' | 'activate' } | null>(null)

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', search, page, rowsPerPage],
    queryFn: () =>
      platformApi.tenants({
        search: search || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      }),
  })

  const mutate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'suspend' | 'activate' }) =>
      action === 'suspend' ? platformApi.suspendTenant(id) : platformApi.activateTenant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      setConfirm(null)
    },
  })

  const rows = tenants.data?.items ?? []

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Tenants</Typography>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
        />
      </Stack>

      {mutate.error && <Alert severity="error" sx={{ mb: 2 }}>{apiErrorMessage(mutate.error)}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Onboarding</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
                  <Typography variant="caption" color="text.secondary">@{t.slug}</Typography>
                </TableCell>
                <TableCell>{t.plan?.name ?? '—'}</TableCell>
                <TableCell><StatusChip status={t.status} /></TableCell>
                <TableCell>{t.onboardingStatus}</TableCell>
                <TableCell align="right">
                  {t.status === 'ACTIVE' ? (
                    <IconButton title="Suspend" onClick={() => setConfirm({ tenant: t, action: 'suspend' })}><PauseCircleIcon /></IconButton>
                  ) : (
                    <IconButton title="Activate" color="success" onClick={() => setConfirm({ tenant: t, action: 'activate' })}><PlayCircleIcon /></IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">No tenants</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={tenants.data?.total ?? 0}
        rowsPerPageOptions={[10, 20, 50]}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
      />

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm?.action === 'suspend' ? 'Suspend tenant' : 'Activate tenant'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm?.action === 'suspend'
              ? `Suspend "${confirm?.tenant.name}"? Its users will lose access while suspended.`
              : `Reactivate "${confirm?.tenant.name}"?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            color={confirm?.action === 'suspend' ? 'error' : 'primary'}
            onClick={() => confirm && mutate.mutate({ id: confirm.tenant.id, action: confirm.action })}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function StatusChip({ status }: { status: PlatformTenant['status'] }) {
  const color = status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'error' : 'warning'
  return <Chip label={status} size="small" color={color} />
}
