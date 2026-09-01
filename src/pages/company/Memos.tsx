import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PublishIcon from '@mui/icons-material/Publish'
import { memosApi, type Memo } from '../../api/memos'
import { branchesApi } from '../../api/branches'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'

export function MemosPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Memo | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<Memo | null>(null)
  const [branchFilter, setBranchFilter] = useState('')

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() })
  const memos = useQuery({
    queryKey: ['memos', branchFilter],
    queryFn: () => memosApi.list({ branchId: branchFilter || undefined }),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['memos'] })

  const save = useMutation({
    mutationFn: (body: { title: string; body: string; branchId?: string | null; publish?: boolean }) =>
      editing
        ? memosApi.update(editing.id, { title: body.title, body: body.body, branchId: body.branchId ?? null })
        : memosApi.create({ title: body.title, body: body.body, branchId: body.branchId || null, publish: body.publish }),
    onSuccess: () => { setCreating(false); setEditing(null); invalidate() },
  })

  const publish = useMutation({
    mutationFn: (id: string) => memosApi.publish(id),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => memosApi.remove(id),
    onSuccess: () => { setConfirm(null); invalidate() },
  })

  const rows = memos.data ?? []
  const branchName = (branchId: string | null) => (branches.data ?? []).find((b) => b.id === branchId)?.name

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Memos</Typography>
        <Can permissions={['memo.create']}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setCreating(true) }}>
            New memo
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

      <Grid container spacing={2}>
        {rows.map((m) => (
          <Grid item xs={12} md={6} key={m.id}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>{m.title}</Typography>
                  <Chip label={m.publishedAt ? 'Published' : 'Draft'} size="small" color={m.publishedAt ? 'success' : 'default'} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>
                  {m.body.length > 240 ? `${m.body.slice(0, 240)}…` : m.body}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {branchName(m.branchId) ?? 'Company-wide'} · {m.createdByUser ? `${m.createdByUser.firstName} ${m.createdByUser.lastName}` : ''} · {new Date(m.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Can permissions={['memo.manage']}>
                  {!m.publishedAt && (
                    <Button size="small" startIcon={<PublishIcon />} onClick={() => publish.mutate(m.id)}>Publish</Button>
                  )}
                  <IconButton size="small" onClick={() => { setEditing(m); setCreating(true) }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => setConfirm(m)}><DeleteIcon fontSize="small" /></IconButton>
                </Can>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {rows.length === 0 && <Grid item xs={12}><Typography color="text.secondary" align="center">No memos</Typography></Grid>}
      </Grid>

      {(creating || editing) && (
        <MemoDialog
          memo={editing}
          open
          branchOptions={(branches.data ?? []).map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={(body) => save.mutate(body)}
          busy={save.isPending}
        />
      )}

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>Delete memo</DialogTitle>
        <DialogContent>Delete "{confirm?.title}"?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => confirm && remove.mutate(confirm.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function MemoDialog({
  memo,
  open,
  branchOptions,
  onClose,
  onSave,
  busy,
}: {
  memo: Memo | null
  open: boolean
  branchOptions: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (body: { title: string; body: string; branchId?: string | null; publish?: boolean }) => void
  busy: boolean
}) {
  const [title, setTitle] = useState(memo?.title ?? '')
  const [body, setBody] = useState(memo?.body ?? '')
  const [branchId, setBranchId] = useState(memo?.branchId ?? '')
  const [publish, setPublish] = useState(false)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{memo ? 'Edit memo' : 'New memo'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            {!memo && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2">Publish now</Typography>
                <Switch checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              </Stack>
            )}
          </Stack>
          <TextField label="Body" value={body} onChange={(e) => setBody(e.target.value)} fullWidth multiline minRows={4} />
          <TextField select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} fullWidth>
            <MenuItem value="">Company-wide</MenuItem>
            {branchOptions.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || !title || !body} onClick={() => onSave({ title, body, branchId: branchId || null, publish })}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}