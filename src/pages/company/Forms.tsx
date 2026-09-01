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
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Switch,
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
import DeleteIcon from '@mui/icons-material/Delete'
import PublishIcon from '@mui/icons-material/Publish'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { formsApi, type FormDef, type FormField, type FormFieldType } from '../../api/forms'
import { branchesApi } from '../../api/branches'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'

const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'TEXTAREA', label: 'Paragraph' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'RADIO', label: 'Choice' },
  { value: 'CHECKBOX', label: 'Checkbox' },
]

export function FormsPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<FormDef | null>(null)
  const [viewing, setViewing] = useState<FormDef | null>(null)
  const [branchFilter, setBranchFilter] = useState('')

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })
  const forms = useQuery({
    queryKey: ['forms', branchFilter],
    queryFn: () => formsApi.list({ branchId: branchFilter || undefined }),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['forms'] })

  const save = useMutation({
    mutationFn: (body: { name: string; description?: string | null; branchId?: string | null; fields: Array<Omit<FormField, 'id'>> }) =>
      formsApi.create({ name: body.name, description: body.description ?? null, branchId: body.branchId ?? null, fields: body.fields }),
    onSuccess: () => { setCreating(false); invalidate() },
  })

  const publish = useMutation({
    mutationFn: (id: string) => formsApi.publish(id),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => formsApi.remove(id),
    onSuccess: () => { setConfirm(null); invalidate() },
  })

  const rows = forms.data ?? []

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Forms</Typography>
        <Can permissions={['form.create']}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            New form
          </Button>
        </Can>
      </Stack>

      <TextField select label="Filter by branch" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} size="small" sx={{ mb: 2, minWidth: 220 }}>
        <MenuItem value="">All branches</MenuItem>
        {(branches.data ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
      </TextField>

      {(save.error || remove.error || publish.error) && (
        <Alert severity="error" sx={{ mb: 2 }}>{apiErrorMessage(save.error ?? remove.error ?? publish.error)}</Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Fields</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((f) => (
              <TableRow key={f.id} hover>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.branch?.name ?? 'All'}</TableCell>
                <TableCell>{f.fields.length}</TableCell>
                <TableCell><Chip label={f.isPublished ? 'Published' : 'Draft'} size="small" color={f.isPublished ? 'success' : 'default'} /></TableCell>
                <TableCell align="right">
                  <Can permissions={['form.view']}>
                    <IconButton title="View submissions" onClick={() => setViewing(f)}><VisibilityIcon fontSize="small" /></IconButton>
                  </Can>
                  <Can permissions={['form.manage']}>
                    {!f.isPublished && (
                      <IconButton title="Publish" onClick={() => publish.mutate(f.id)}><PublishIcon fontSize="small" /></IconButton>
                    )}
                    <IconButton color="error" onClick={() => setConfirm(f)}><DeleteIcon fontSize="small" /></IconButton>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center">No forms</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {creating && (
        <FormDialog
          branchOptions={(branches.data ?? []).map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => setCreating(false)}
          onSave={(body) => save.mutate(body)}
          busy={save.isPending}
        />
      )}

      {viewing && <SubmissionsDialog form={viewing} onClose={() => setViewing(null)} />}

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>Delete form</DialogTitle>
        <DialogContent>Delete "{confirm?.name}"?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => confirm && remove.mutate(confirm.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

interface FieldDraft {
  key: string
  label: string
  type: FormFieldType
  required: boolean
  options: string
}

function FormDialog({
  branchOptions,
  onClose,
  onSave,
  busy,
}: {
  branchOptions: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (body: { name: string; description?: string | null; branchId?: string | null; fields: Array<Omit<FormField, 'id'>> }) => void
  busy: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [branchId, setBranchId] = useState('')
  const [fields, setFields] = useState<FieldDraft[]>([emptyField()])

  const setField = (i: number, patch: Partial<FieldDraft>) => {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  const canSave = name && fields.every((f) => f.key && f.label)

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}>
      <DialogTitle>New form</DialogTitle>
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

          <Divider />
          <Typography variant="subtitle1" fontWeight={700}>Fields</Typography>
          {fields.map((f, i) => (
            <Box key={i} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <TextField size="small" label="Key" value={f.key} onChange={(e) => setField(i, { key: e.target.value })} sx={{ width: 180 }} />
                  <TextField size="small" label="Label" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} fullWidth />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField select size="small" label="Type" value={f.type} onChange={(e) => setField(i, { type: e.target.value as FormFieldType })} sx={{ width: 180 }}>
                    {FIELD_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                  {(f.type === 'SELECT' || f.type === 'RADIO') && (
                    <TextField size="small" label="Options (comma separated)" value={f.options} onChange={(e) => setField(i, { options: e.target.value })} fullWidth />
                  )}
                  {f.type === 'CHECKBOX' && (
                    <Typography variant="body2" color="text.secondary">Checkbox field</Typography>
                  )}
                  <Stack direction="row" alignItems="center">
                    <Typography variant="body2">Required</Typography>
                    <Switch checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} />
                  </Stack>
                  <IconButton color="error" disabled={fields.length === 1} onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setFields((prev) => [...prev, emptyField()])} sx={{ alignSelf: 'flex-start' }}>
            Add field
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy || !canSave}
          onClick={() => onSave({
            name,
            description: description || null,
            branchId: branchId || null,
            fields: fields.map((f, i) => ({
              key: f.key,
              label: f.label,
              type: f.type,
              required: f.required,
              order: i,
              ...((f.type === 'SELECT' || f.type === 'RADIO')
                ? { options: f.options.split(',').map((o) => o.trim()).filter(Boolean) }
                : {}),
            })),
          })}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function emptyField(): FieldDraft {
  return { key: '', label: '', type: 'TEXT', required: false, options: '' }
}

function SubmissionsDialog({ form, onClose }: { form: FormDef; onClose: () => void }) {
  const submissions = useQuery({
    queryKey: ['form-submissions', form.id],
    queryFn: () => formsApi.listSubmissions(form.id),
  })

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Submissions for {form.name}</DialogTitle>
      <DialogContent>
        <List dense>
          {(submissions.data ?? []).map((s) => (
            <ListItem key={s.id} alignItems="flex-start" sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <ListItemText
                primary={`${s.submittedBy?.firstName ?? ''} ${s.submittedBy?.lastName ?? ''}`.trim() || s.submittedByUserId}
                secondary={
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {new Date(s.createdAt).toLocaleString()}{'\n'}{JSON.stringify(s.data, null, 2)}
                  </Typography>
                }
              />
            </ListItem>
          ))}
          {(submissions.data ?? []).length === 0 && <Alert severity="info">No submissions yet.</Alert>}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}