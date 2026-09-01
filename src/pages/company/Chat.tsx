import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AddCommentIcon from '@mui/icons-material/AddComment'
import { chatApi, type Conversation } from '../../api/chat'
import { staffApi } from '../../api/staff'
import { useAuthStore } from '../../store/auth'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'

export function ChatPage() {
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [selectedId, setSelectedId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const conversations = useQuery({ queryKey: ['conversations'], queryFn: () => chatApi.listConversations(), refetchInterval: 15000 })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['conversations'] })

  const selectConversation = (id: string) => {
    setSelectedId(id)
    void chatApi.markRead(id).then(() => invalidate())
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 160px)' }}>
      <Paper variant="outlined" sx={{ width: 320, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5 }}>
          <Typography variant="h6" fontWeight={700}>Messages</Typography>
          <Can permissions={['chat.create']}>
            <IconButton onClick={() => setCreating(true)} title="New conversation"><AddCommentIcon /></IconButton>
          </Can>
        </Stack>
        <Divider />
        {error && <Alert severity="error" sx={{ m: 1 }} onClose={() => setError('')}>{error}</Alert>}
        <List dense sx={{ overflow: 'auto', flex: 1 }}>
          {(conversations.data ?? []).map((c) => {
            const title = conversationTitle(c, me?.email ?? '')
            return (
              <ListItem key={c.id} disablePadding>
                <ListItemButton selected={selectedId === c.id} onClick={() => selectConversation(c.id)}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 36, height: 36, fontSize: 15 }}>{title.charAt(0).toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={title}
                    secondary={c.lastMessage?.body ?? 'No messages yet'}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
          {(conversations.data ?? []).length === 0 && (
            <ListItem><ListItemText primary="No conversations yet." sx={{ textAlign: 'center' }} /></ListItem>
          )}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedId ? (
          <Thread conversationId={selectedId} myEmail={me?.email ?? ''} onTitleOpen={() => { void chatApi.markRead(selectedId).then(() => invalidate()) }} />
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Select a conversation to start chatting.</Typography>
          </Box>
        )}
      </Paper>

      {creating && (
        <NewConversationDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); selectConversation(id) }}
        />
      )}
    </Box>
  )
}

function Thread({ conversationId, myEmail }: { conversationId: string; myEmail: string; onTitleOpen: () => void }) {
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  const conversation = useQuery({ queryKey: ['conversation', conversationId], queryFn: () => chatApi.getConversation(conversationId) })
  const messages = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatApi.listMessages(conversationId, { limit: 50 }),
    refetchInterval: 5000,
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.data?.length])

  const send = useMutation({
    mutationFn: (body: string) => chatApi.sendMessage(conversationId, { body }),
    onSuccess: () => {
      setDraft('')
      qc.invalidateQueries({ queryKey: ['messages', conversationId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const title = conversation.data ? conversationTitle(conversation.data, myEmail) : ''

  return (
    <>
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ m: 1 }} onClose={() => setError('')}>{error}</Alert>}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {(messages.data ?? []).map((m) => {
          const mine = m.senderId === me?.id
          return (
            <Box key={m.id} sx={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
              <Box sx={{
                bgcolor: mine ? 'primary.main' : 'grey.200',
                color: mine ? 'primary.contrastText' : 'text.primary',
                borderRadius: 2,
                px: 1.5,
                py: 1,
              }}>
                <Typography variant="body2">{m.body}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, textAlign: mine ? 'right' : 'left' }}>
                {m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : 'You'} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
          )
        })}
        {messages.isFetching && messages.data?.length === 0 && (
          <Typography color="text.secondary" align="center">Loading messages…</Typography>
        )}
        <div ref={endRef} />
      </Box>
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && draft.trim()) { e.preventDefault(); send.mutate(draft.trim()) } }}
          />
          <Button variant="contained" disabled={!draft.trim() || send.isPending} onClick={() => send.mutate(draft.trim())}>
            <SendIcon />
          </Button>
        </Stack>
      </Box>
    </>
  )
}

function NewConversationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [type, setType] = useState<'DIRECT' | 'GROUP'>('DIRECT')
  const [otherUserId, setOtherUserId] = useState('')
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const staff = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() })

  const create = useMutation({
    mutationFn: () => chatApi.createConversation(type === 'DIRECT' ? { type, otherUserId } : { type, name, memberIds }),
    onSuccess: (conv) => onCreated(conv.id),
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const users = (staff.data ?? []).map((s) => ({ id: s.user.id, name: `${s.user.firstName} ${s.user.lastName}`, email: s.user.email }))

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New conversation</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value as 'DIRECT' | 'GROUP')} fullWidth>
            <MenuItem value="DIRECT">Direct message</MenuItem>
            <MenuItem value="GROUP">Group chat</MenuItem>
          </TextField>

          {type === 'DIRECT' ? (
            <TextField select label="Person" value={otherUserId} onChange={(e) => setOtherUserId(e.target.value)} fullWidth>
              <MenuItem value="">Select…</MenuItem>
              {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name} ({u.email})</MenuItem>)}
            </TextField>
          ) : (
            <>
              <TextField label="Group name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
              <TextField
                select
                label="Members"
                value={memberIds}
                onChange={(e) => setMemberIds(e.target.value as unknown as string[])}
                fullWidth
                SelectProps={{ multiple: true }}
              >
                {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </TextField>
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={create.isPending || (type === 'DIRECT' && !otherUserId) || (type === 'GROUP' && (!name || memberIds.length === 0))}
          onClick={() => create.mutate()}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function otherMember(c: Conversation, myEmail: string): Conversation['members'][number] | undefined {
  return c.members.find((m) => m.user?.email && m.user.email !== myEmail)
}

function conversationTitle(c: Conversation, myEmail: string): string {
  if (c.name) return c.name
  const other = otherMember(c, myEmail)
  if (other?.user) return `${other.user.firstName} ${other.user.lastName}`
  return 'Conversation'
}