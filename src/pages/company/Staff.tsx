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
  DialogTitle,
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
import AddIcon from '@mui/icons-material/Add'
import { staffApi } from '../../api/staff'
import { branchesApi } from '../../api/branches'
import { rolesApi } from '../../api/roles'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'

export function StaffPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [tempPassword, setTempPassword] = useState('')

  const staff = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() })
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list() })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['staff'] })
  }

  const create = useMutation({
    mutationFn: (body: Parameters<typeof staffApi.create>[0]) => staffApi.create(body),
    onSuccess: (res) => {
      setCreating(false)
      setTempPassword(res.temporaryPassword ?? '')
      invalidate()
    },
  })

  const rows = staff.data ?? []

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Staff</Typography>
        <Can permissions={['staff.create']}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            Add staff
          </Button>
        </Can>
      </Stack>

      {create.error && <Alert severity="error" sx={{ mb: 2 }}>{apiErrorMessage(create.error)}</Alert>}
      {tempPassword && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setTempPassword('')}>
          Staff created. Share this temporary password once: <strong>{tempPassword}</strong>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Job title</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.user.firstName} {s.user.lastName}</TableCell>
                <TableCell>{s.user.email}</TableCell>
                <TableCell>{s.branch.name}</TableCell>
                <TableCell>{s.jobTitle ?? '—'}</TableCell>
                <TableCell>
                  {s.roles.map((r) => <Chip key={r.assignmentId ?? r.id} label={r.name} size="small" sx={{ mr: 0.5 }} />)}
                </TableCell>
                <TableCell><Chip label={s.isActive ? 'Active' : 'Inactive'} size="small" color={s.isActive ? 'success' : 'default'} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No staff</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {creating && (
        <CreateStaffDialog
          open={creating}
          onClose={() => setCreating(false)}
          branches={(branches.data ?? []).map((b) => ({ id: b.id, name: b.name }))}
          roles={(roles.data ?? []).map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem }))}
          busy={create.isPending}
          onSave={(body) => create.mutate(body)}
        />
      )}
    </Box>
  )
}

function CreateStaffDialog({
  open,
  onClose,
  branches,
  roles,
  busy,
  onSave,
}: {
  open: boolean
  onClose: () => void
  branches: Array<{ id: string; name: string }>
  roles: Array<{ id: string; name: string; isSystem: boolean }>
  busy: boolean
  onSave: (body: Parameters<typeof staffApi.create>[0]) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [branchId, setBranchId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])

  const editableRoles = roles.filter((r) => !r.isSystem)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add staff</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
            <TextField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
          </Stack>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} fullWidth>
            {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
          <TextField label="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} fullWidth />
          <TextField
            select
            label="Roles"
            value={roleIds}
            onChange={(e) => setRoleIds(e.target.value as unknown as string[])}
            fullWidth
            SelectProps={{ multiple: true }}
          >
            {editableRoles.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy || !firstName || !lastName || !email || !branchId}
          onClick={() => onSave({ firstName, lastName, email, branchId, jobTitle: jobTitle || undefined, roleIds: roleIds.length ? roleIds : undefined })}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
