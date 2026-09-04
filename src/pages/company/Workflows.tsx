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
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { workflowsApi, type CreateWorkflowTemplateInput, type WorkflowInstance, type WorkflowTemplate, type WorkflowStatus } from '../../api/workflows'
import { formsApi, type FormDef } from '../../api/forms'
import { isChildForm } from '../../lib/childForms'
import { FormFieldInput } from '../../components/FormFields'
import { rolesApi } from '../../api/roles'
import { staffApi } from '../../api/staff'
import { branchesApi } from '../../api/branches'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'
import { useTenantStore } from '../../store/tenant'

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
  const [starting, setStarting] = useState(false)
  const [editing, setEditing] = useState<WorkflowTemplate | null>(null)
  const [confirm, setConfirm] = useState<WorkflowTemplate | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [activeInstance, setActiveInstance] = useState<WorkflowInstance | null>(null)

  const isSecretary = useTenantStore((s) => (s.current?.roles ?? []).some((r) => /secretary/i.test(r.name)))

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
        <Stack direction="row" spacing={1}>
          <Tooltip title={isSecretary ? 'Start a workflow flow with a form' : 'Only the Secretary can start a workflow flow'}>
            <span>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setStarting(true)} disabled={!isSecretary}>
                Start workflow
              </Button>
            </span>
          </Tooltip>
          <Can permissions={['workflow.create']}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreating(true)} disabled={tab === 'instances'}>
              New template
            </Button>
          </Can>
        </Stack>
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
                      <IconButton title="Edit template" onClick={() => setEditing(t)}><EditIcon fontSize="small" /></IconButton>
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
                  <TableCell>REFF</TableCell>
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
                    <TableCell>{i.refNumber ?? '—'}{i.parentRefNumber ? ` (↳ ${i.parentRefNumber})` : ''}</TableCell>
                    <TableCell>{i.template?.name ?? i.templateId}</TableCell>
                    <TableCell>{i.initiatedByUser ? `${i.initiatedByUser.firstName} ${i.initiatedByUser.lastName}` : '—'}</TableCell>
                    <TableCell><Chip label={i.status} size="small" color={STATUS_COLORS[i.status]} /></TableCell>
                    <TableCell>{new Date(i.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setActiveInstance(i)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {instanceRows.length === 0 && <TableRow><TableCell colSpan={7} align="center">No workflow instances</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {creating && <CreateTemplateDialog onClose={() => setCreating(false)} onSaved={invalidate} />}

      {starting && <StartWorkflowDialog onClose={() => setStarting(false)} onSaved={invalidate} />}

      {editing && (
        <EditTemplateDialog template={editing} onClose={() => setEditing(null)} onSaved={invalidate} />
      )}

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

function StartWorkflowDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient()
  const templates = useQuery({
    queryKey: ['wf-templates', 'active'],
    queryFn: () => workflowsApi.listTemplates({ active: true }),
  })
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })

  const [templateId, setTemplateId] = useState('')
  const [title, setTitle] = useState('')
  const [branchId, setBranchId] = useState('')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [parentRefNumber, setParentRefNumber] = useState('')
  const [error, setError] = useState('')

  const selectedTemplate = (templates.data ?? []).find((t) => t.id === templateId)

  const linkedForm = useQuery({
    queryKey: ['form', selectedTemplate?.formId],
    queryFn: () => formsApi.get(selectedTemplate!.formId!),
    enabled: !!selectedTemplate?.formId,
  })
  const form: FormDef | null = linkedForm.data ?? null
  const isChild = form ? isChildForm(form.name) : false

  const start = useMutation({
    mutationFn: async () => {
      const payload = { ...values }
      if (isChild) payload.parentRefNumber = parentRefNumber.trim()
      let refNumber: string | null = null
      let parentNum: string | null = null
      if (form) {
        const submission = await formsApi.submit(form.id, payload)
        refNumber = submission.refNumber
        parentNum = submission.parentRefNumber
      } else if (parentRefNumber.trim()) {
        parentNum = parentRefNumber.trim()
      }
      return workflowsApi.start({
        templateId,
        title,
        branchId: branchId || null,
        refNumber,
        parentRefNumber: parentNum,
        payload,
      })
    },
    onSuccess: () => { onSaved(); onClose(); qc.invalidateQueries({ queryKey: ['wf-templates'] }) },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const missing = form
    ? form.fields.filter((f) => f.required && (values[f.key] === undefined || values[f.key] === null || values[f.key] === ''))
    : []
  const canStart = templateId && title.trim() && missing.length === 0 && (!isChild || parentRefNumber.trim().length > 0)

  const setValue = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }))

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Start workflow</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          <TextField
            select
            label="Workflow template"
            value={templateId}
            onChange={(e) => { setTemplateId(e.target.value); setValues({}) }}
            fullWidth
            helperText="Choose the type of request you want to start."
          >
            <MenuItem value=""><em>Select…</em></MenuItem>
            {(templates.data ?? []).map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <TextField select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="">All branches</MenuItem>
              {(branches.data ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
          </Stack>

          {isChild && (
            <TextField
              label="Customer Ticket REFF (parent)"
              value={parentRefNumber}
              onChange={(e) => setParentRefNumber(e.target.value)}
              fullWidth
              required
              helperText="This is a child flow that must be linked to a Customer Ticket. Enter the parent's REFF."
            />
          )}

          {form && (
            <>
              <Typography variant="subtitle1" fontWeight={700}>Form: {form.name}</Typography>
              {form.fields.map((f) => (
                <FormFieldInput key={f.key} field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} />
              ))}
              {missing.length > 0 && (
                <Typography variant="body2" color="error">Fill required fields: {missing.map((f) => f.label).join(', ')}</Typography>
              )}
            </>
          )}
          {!form && selectedTemplate && <Alert severity="info">This workflow has no linked form — you can start it with a title only.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={start.isPending || !canStart} onClick={() => start.mutate()}>
          {start.isPending ? 'Starting…' : 'Start workflow'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CreateTemplateDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
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

function EditTemplateDialog({
  template,
  onClose,
  onSaved,
}: {
  template: WorkflowTemplate
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list() })
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() })
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })

  const update = useMutation({
    mutationFn: (body: Partial<CreateWorkflowTemplateInput & { isActive?: boolean }>) =>
      workflowsApi.updateTemplate(template.id, body),
    onSuccess: () => { onClose(); onSaved(); qc.invalidateQueries({ queryKey: ['roles'] }) },
  })

  return (
    <TemplateDialog
      initial={template}
      roleOptions={(roles.data ?? []).map((r) => ({ id: r.id, name: r.name }))}
      staffOptions={(staff.data ?? []).map((s) => ({ id: s.user.id, name: `${s.user.firstName} ${s.user.lastName}` }))}
      branchOptions={(branches.data ?? []).map((b) => ({ id: b.id, name: b.name }))}
      onClose={onClose}
      onSave={(body) => update.mutate(body)}
      busy={update.isPending}
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
  initial,
}: {
  roleOptions: Array<{ id: string; name: string }>
  staffOptions: Array<{ id: string; name: string }>
  branchOptions: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (body: { name: string; description?: string | null; branchId?: string | null; isActive?: boolean; steps: Array<{ name: string; order: number; action: 'SUBMISSION' | 'APPROVE' | 'REJECT' | 'ACKNOWLEDGE' | 'PROVIDE_INFO' | 'EXECUTION' | 'CLOSURE'; assigneeRuleType: 'COMPANY_ROLE' | 'USER' | 'ORIGINATOR_MANAGER'; assigneeCompanyRoleId?: string; assigneeUserId?: string; isFinal?: boolean; isRequired?: boolean; dueInMinutes?: number }> }) => void
  busy: boolean
  initial?: WorkflowTemplate | null
}) {
  const isEditing = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [branchId, setBranchId] = useState(initial?.branchId ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  type StepDraft = {
    name: string
    action: 'SUBMISSION' | 'APPROVE' | 'REJECT' | 'ACKNOWLEDGE' | 'PROVIDE_INFO' | 'EXECUTION' | 'CLOSURE'
    assigneeRuleType: 'COMPANY_ROLE' | 'USER' | 'ORIGINATOR_MANAGER'
    assigneeCompanyRoleId: string
    assigneeUserId: string
    isFinal: boolean
  }
  const [steps, setSteps] = useState<StepDraft[]>(() =>
    initial && initial.steps.length > 0
      ? initial.steps.map((s) => ({
          name: s.name,
          action: s.action,
          assigneeRuleType: s.assigneeRuleType,
          assigneeCompanyRoleId: s.assigneeCompanyRoleId ?? '',
          assigneeUserId: s.assigneeUserId ?? '',
          isFinal: s.isFinal ?? false,
        }))
      : [
          { name: 'Approval', action: 'APPROVE', assigneeRuleType: 'COMPANY_ROLE', assigneeCompanyRoleId: '', assigneeUserId: '', isFinal: true },
        ]
  )

  const setStep = (i: number, patch: Partial<(typeof steps)[number]>) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" sx={{ '& .MuiDialog-paper': { maxHeight: '92vh' } }}>
      <DialogTitle>{isEditing ? 'Edit workflow template' : 'New workflow template'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active" sx={{ minWidth: 120 }} />
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
                    <MenuItem value="SUBMISSION">Submission</MenuItem>
                    <MenuItem value="APPROVE">Approve</MenuItem>
                    <MenuItem value="REJECT">Reject</MenuItem>
                    <MenuItem value="ACKNOWLEDGE">Acknowledge</MenuItem>
                    <MenuItem value="PROVIDE_INFO">Provide info</MenuItem>
                    <MenuItem value="EXECUTION">Execution</MenuItem>
                    <MenuItem value="CLOSURE">Closure</MenuItem>
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
            isActive,
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
          {isEditing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function InstanceDialog({ instanceId, onClose, onChanged }: { instanceId: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const roleNames = useTenantStore((s) => (s.current?.roles ?? []).map((r) => r.name))
  const isStaff = roleNames.some((n) => /staff/i.test(n))
  const isSecretary = roleNames.some((n) => /secretary/i.test(n))
  const isExecutor = roleNames.some((n) => /it manager/i.test(n) || /account assist/i.test(n))

  const instance = useQuery({ queryKey: ['wf-instance', instanceId], queryFn: () => workflowsApi.getInstance(instanceId) })

  const decide = useMutation({
    mutationFn: (kind: 'approve' | 'reject') =>
      kind === 'approve' ? workflowsApi.approve(instanceId, { note: note || undefined }) : workflowsApi.reject(instanceId, { note: note || undefined }),
    onSuccess: () => { setNote(''); onChanged(); qc.invalidateQueries({ queryKey: ['wf-instance', instanceId] }) },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const execute = useMutation({
    mutationFn: () => workflowsApi.execute(instanceId, { note: note || undefined }),
    onSuccess: () => { setNote(''); onChanged(); qc.invalidateQueries({ queryKey: ['wf-instance', instanceId] }) },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const cancel = useMutation({
    mutationFn: () => workflowsApi.cancel(instanceId),
    onSuccess: () => { onChanged(); qc.invalidateQueries({ queryKey: ['wf-instance', instanceId] }) },
  })

  const isPending = instance.data?.status === 'PENDING'
  const canApprove = isPending && !isStaff && !isSecretary
  const canExecute = isPending && isExecutor

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
            {instance.data.refNumber && (
              <Typography variant="body2" fontWeight={600}>
                REFF: {instance.data.refNumber}
                {instance.data.parentRefNumber ? ` (bundled under ${instance.data.parentRefNumber})` : ''}
              </Typography>
            )}
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
            {isPending && (
              <>
                <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />
                <Stack direction="row" spacing={1}>
                  <Tooltip title={canExecute ? '' : 'Only IT Manager or Account Assist can execute a step'}>
                    <span>
                      <Button variant="contained" color="info" startIcon={<PlayArrowIcon />} disabled={!canExecute || execute.isPending || decide.isPending} onClick={() => execute.mutate()}>
                        Execute
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={canApprove ? '' : 'Only reviewers can approve or reject'}>
                    <span>
                      <Button variant="contained" color="success" startIcon={<CheckIcon />} disabled={!canApprove || decide.isPending || execute.isPending} onClick={() => decide.mutate('approve')}>
                        Approve
                      </Button>
                      <Button variant="outlined" color="error" startIcon={<CloseIcon />} disabled={!canApprove || decide.isPending || execute.isPending} onClick={() => decide.mutate('reject')}>
                        Reject
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </>
            )}
            {isPending && (
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
