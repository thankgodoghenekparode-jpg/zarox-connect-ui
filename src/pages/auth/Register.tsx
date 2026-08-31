import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { api } from '../../api/client'
import { apiErrorMessage } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import { isPlatformAdmin } from '../../store/tenant'
import { useTenantStore } from '../../store/tenant'
import { AuthShell } from './AuthShell'

interface ActivePlan {
  id: string
  code: string
  name: string
  priceCents: number
}

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const loadTenant = useTenantStore((s) => s.load)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    planCode: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: plans } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => api.get<ActivePlan[]>('/plans').then((r) => r.data),
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { user } = await register({
        ...form,
        planCode: form.planCode || undefined,
      }) as unknown as { user: { role: string } }
      await loadTenant()
      navigate(isPlatformAdmin(user.role) ? '/admin' : '/app', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Create your tenant account">
      <form onSubmit={onSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={2}>
            <TextField label="First name" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} fullWidth />
            <TextField label="Last name" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} fullWidth />
          </Stack>
          <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} fullWidth />
          <TextField label="Company name" required value={form.companyName} onChange={(e) => set('companyName', e.target.value)} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Plan</InputLabel>
            <Select
              label="Plan"
              value={form.planCode}
              onChange={(e) => set('planCode', e.target.value as string)}
            >
              {(plans ?? []).map((p) => (
                <MenuItem key={p.id} value={p.code} disabled={p.priceCents > 0}>
                  {p.name}
                  {p.priceCents > 0 ? ` ($${(p.priceCents / 100).toFixed(2)}/mo)` : ' (Free)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => set('password', e.target.value)} fullWidth />
          <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
          </Button>
          <Link href="/login" variant="body2" align="center">Already have an account? Sign in</Link>
        </Stack>
      </form>
    </AuthShell>
  )
}
