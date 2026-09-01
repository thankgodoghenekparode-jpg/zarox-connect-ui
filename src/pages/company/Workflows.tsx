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
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { workflowsApi, type CreateWorkflowTemplateInput, type WorkflowInstance, type WorkflowTemplate, type WorkflowStatus } from '../../api/workflows'
import { rolesApi } from '../../api/roles'
import { staffApi } from '../../api/staff'
import { branchesApi } from '../../api/branches'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'

const STATUS_COLORS: Record<WorkflowStatus, 'success' | 'warning' | 'error' | 'default'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
}

export function WorkflowsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'templates' | 'instances'>('templates')
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<WorkflowTemplate | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [activeInstance, setActiveInstance] = useState<WorkflowInstance | null>(null)

  const templates = useQuery({ queryKey: ['wf-templates'], queryFn: () => workflowsApi.listTemplates() })
  const instances = useQuery({
    queryKey: ['wf-instances', statusFilter],
    queryFn: () => workflowsApi.listInstances({ status: (statusFilter as WorkflowStatus) || undefined }),
  })
  const approvals = useQuery({ queryKey: ['wf-approvals'], queryFn: () => workflowsApi.approvals() })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['wf-templates'] })
    qc.invalidateQueries({ queryKey: ['wf-instances'] })
    qc.invalidateQueries({ queryKey: ['wf-approvals'] })
  }

  const removeTemplate = useMutation({
    mutationFn: (id: string) => workflowsApi.removeTemplate(id),
    onSuccess: () => { setConfirm(null); invalidate() },
  })

  const rows = templates.data ?? []
  const instanceRows = instances.data ?? []
  const approvalRows = approvals.data ?? []

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Workflows</Typography>
        <Can permissions={['workflow.create']}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} disabled={tab === 'instances'}>
            New template
          </Button>
        </Can>
      </Stack>

      {removeTemplate.error && <Alert severity="error" sx={{ mb: 2 }}>{apiErrorMessage(removeTemplate.error)}</Alert>}

      {approvalRows.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have <strong>{approvalRows.length}</strong> pending approval{approvalRows.length > 1 ? 's' : ''}. Open a pending instance below to approve or reject.
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Templates" value="templates" />
        <Tab label="Instances" value="instances" />
      </Tabs>

      {tab === 'templates' ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Steps</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Instances</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.steps.length}</TableCell>
                  <TableCell><Chip label={t.isActive ? 'Active' : 'Inactive'} size="small" color={t.isActive ? 'success' : 'default'} /></TableCell>
                  <TableCell>{t._count?.instances ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Can permissions={['workflow.create']}>
                      <IconButton color="error" onClick={() => setConfirm(t)}><DeleteIcon fontSize="small" /></IconButton>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center">No templates</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box>
          <TextField select label="Status" size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ mb: 2, minWidth: 180 }}>
            <MenuItem value="">All statuses</MenuItem>
            {Object.keys(STATUS_COLORS).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Initiated by</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instanceRows.map((i) => (
                  <TableRow key={i.id} hover>
                    <TableCell>{i.title}</TableCell>
                    <TableCell>{i.template?.name ?? i.templateId}</TableCell>
                    <TableCell>{i.initiatedByUser ? `${i.initiatedByUser.firstName} ${i.initiatedByUser.lastName}` : '—'}</TableCell>
                    <TableCell><Chip label={i.status} size="small" color={STATUS_COLORS[i.status]} /></TableCell>
                    <TableCell>{new Date(i.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setActiveInstance(i)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {instanceRows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No workflow instances</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {creating && <CreateTemplateDialog onClose={() => setCreating(false)} onSaved={invalidate} />}

      {activeInstance && (
        <InstanceDialog
          instanceId={activeInstance.id}
          onClose={() => setActiveInstance(null)}
          onChanged={invalidate}
        />
      )}

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>Delete template</DialogTitle>
        <DialogContent>Delete "{confirm?.name}"?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => confirm && removeTemplate.mutate(confirm.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function CreateTemplateDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list() })
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() })
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })

  const create = useMutation({
    mutationFn: (body: CreateWorkflowTemplateInput) => workflowsApi.createTemplate(body),
    onSuccess: () => { onClose(); onSaved(); qc.invalidateQueries({ queryKey: ['roles'] }) },
  })

  return (
    <TemplateDialog
      roleOptions={(roles.data ?? []).map((r) => ({ id: r.id, name: r.name }))}
      staffOptions={(staff.data ?? []).map((s) => ({ id: s.user.id, name: `${s.user.firstName} ${s.user.lastName}` }))}
      branchOptions={(branches.data ?? []).map((b) => ({ id: b.id, name: b.name }))}
      onClose={onClose}
      onSave={(body) => create.mutate(body)}
      busy={create.isPending}
    />
  )
}

function TemplateDialog({
  roleOptions,
  staffOptions,
  branchOptions,
  onClose,
  onSave,
  busy,
}: {
  roleOptions: Array<{ id: string; name: string }>
  staffOptions: Array<{ id: string; name: string }>
  branchOptions: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (body: { name: string; description?: string | null; branchId?: string | null; steps: Array<{ name: string; order: number; action: 'APPROVE' | 'REJECT' | 'ACKNOWLEDGE' | 'PROVIDE_INFO'; assigneeRuleType: 'COMPANY_ROLE' | 'USER' | 'ORIGINATOR_MANAGER'; assigneeCompanyRoleId?: string; assigneeUserId?: string; isFinal?: boolean; isRequired?: boolean; dueInMinutes?: number }> }) => void
  busy: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [branchId, setBranchId] = useState('')
  type StepDraft = {
    name: string
    action: 'APPROVE' | 'REJECT' | 'ACKNOWLEDGE' | 'PROVIDE_INFO'
    assigneeRuleType: 'COMPANY_ROLE' | 'USER' | 'ORIGINATOR_MANAGER'
    assigneeCompanyRoleId: string
    assigneeUserId: string
    isFinal: boolean
  }
  const [steps, setSteps] = useState<StepDraft[]>([
    { name: 'Approval', action: 'APPROVE', assigneeRuleType: 'COMPANY_ROLE', assigneeCompanyRoleId: '', assigneeUserId: '', isFinal: true },
  ])

  const setStep = (i: number, patch: Partial<(typeof steps)[number]>) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" sx={{ '& .MuiDialog-paper': { maxHeight: '92vh' } }}>
      <DialogTitle>New workflow template</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="">All branches</MenuItem>
              {branchOptions.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />

          <Typography variant="subtitle1" fontWeight={700}>Steps</Typography>
          {steps.map((s, i) => (
            <Box key={i} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <TextField size="small" label="Step name" value={s.name} onChange={(e) => setStep(i, { name: e.target.value })} fullWidth />
                  <TextField select size="small" label="Action" value={s.action} onChange={(e) => setStep(i, { action: e.target.value as typeof s.action })} sx={{ width: 160 }}>
                    <MenuItem value="APPROVE">Approve</MenuItem>
                    <MenuItem value="REJECT">Reject</MenuItem>
                    <MenuItem value="ACKNOWLEDGE">Acknowledge</MenuItem>
                    <MenuItem value="PROVIDE_INFO">Provide info</MenuItem>
                  </TextField>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField select size="small" label="Assignee" value={s.assigneeRuleType} onChange={(e) => setStep(i, { assigneeRuleType: e.target.value as typeof s.assigneeRuleType })} sx={{ width: 190 }}>
                    <MenuItem value="COMPANY_ROLE">Company role</MenuItem>
                    <MenuItem value="USER">Specific user</MenuItem>
                    <MenuItem value="ORIGINATOR_MANAGER">Originator's manager</MenuItem>
                  </TextField>
                  {s.assigneeRuleType === 'COMPANY_ROLE' && (
                    <TextField select size="small" label="Role" value={s.assigneeCompanyRoleId} onChange={(e) => setStep(i, { assigneeCompanyRoleId: e.target.value })} fullWidth>
                      <MenuItem value="">Select role…</MenuItem>
                      {roleOptions.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                    </TextField>
                  )}
                  {s.assigneeRuleType === 'USER' && (
                    <TextField select size="small" label="User" value={s.assigneeUserId} onChange={(e) => setStep(i, { assigneeUserId: e.target.value })} fullWidth>
                      <MenuItem value="">Select user…</MenuItem>
                      {staffOptions.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                    </TextField>
                  )}
                  <IconButton color="error" disabled={steps.length === 1} onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setSteps((prev) => [...prev, { name: `Step ${prev.length + 1}`, action: 'APPROVE', assigneeRuleType: 'COMPANY_ROLE', assigneeCompanyRoleId: '', assigneeUserId: '', isFinal: true }])} sx={{ alignSelf: 'flex-start' }}>
            Add step
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy || !name || steps.length === 0}
          onClick={() => onSave({
            name,
            description: description || null,
            branchId: branchId || null,
            steps: steps.map((s, i) => ({
              name: s.name,
              order: i + 1,
              action: s.action,
              assigneeRuleType: s.assigneeRuleType,
              assigneeCompanyRoleId: s.assigneeRuleType === 'COMPANY_ROLE' ? s.assigneeCompanyRoleId || undefined : undefined,
              assigneeUserId: s.assigneeRuleType === 'USER' ? s.assigneeUserId || undefined : undefined,
              isFinal: s.isFinal,
              isRequired: true,
            })),
          })}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function InstanceDialog({ instanceId, onClose, onChanged }: { instanceId: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const instance = useQuery({ queryKey: ['wf-instance', instanceId], queryFn: () => workflowsApi.getInstance(instanceId) })

  const decide = useMutation({
    mutationFn: (kind: 'approve' | 'reject') =>
      kind === 'approve' ? workflowsApi.approve(instanceId, { note: note || undefined }) : workflowsApi.reject(instanceId, { note: note || undefined }),
    onSuccess: () => { setNote(''); onChanged(); qc.invalidateQueries({ queryKey: ['wf-instance', instanceId] }) },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const cancel = useMutation({
    mutationFn: () => workflowsApi.cancel(instanceId),
    onSuccess: () => { onChanged(); qc.invalidateQueries({ queryKey: ['wf-instance', instanceId] }) },
  })

  const canAct = instance.data?.status === 'PENDING'

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{instance.data?.title ?? 'Workflow instance'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {instance.isLoading && <Typography>Loading…</Typography>}
        {instance.data && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={instance.data.status} size="small" color={STATUS_COLORS[instance.data.status]} />
              <Typography variant="body2" color="text.secondary">
                {instance.data.template?.name ?? ''} · {new Date(instance.data.createdAt).toLocaleString()}
              </Typography>
            </Stack>
            {instance.data.payload && (
              <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(instance.data.payload, null, 2)}
              </Typography>
            )}
            <Typography variant="subtitle2">Steps</Typography>
            {(instance.data.stepInstances ?? []).map((s) => (
              <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                <Typography variant="body2">{s.step?.name ?? s.stepId}</Typography>
                <Chip label={s.status} size="small" variant="outlined" />
              </Box>
            ))}
            {canAct && (
              <>
                <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" color="success" startIcon={<CheckIcon />} disabled={decide.isPending} onClick={() => decide.mutate('approve')}>
                    Approve
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<CloseIcon />} disabled={decide.isPending} onClick={() => decide.mutate('reject')}>
                    Reject
                  </Button>
                </Stack>
              </>
            )}
            {canAct && (
              <Button variant="text" color="inherit" size="small" onClick={() => cancel.mutate()} sx={{ alignSelf: 'flex-start' }}>
                Cancel instance
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}