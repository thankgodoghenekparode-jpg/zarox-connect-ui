import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { settingsApi, type TenantSettings } from '../../api/settings'
import { apiErrorMessage } from '../../api/client'
import { Can } from '../../components/PermissionGate'

export function CompanySettingsPage() {
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() })

  if (settings.isLoading) {
    return <CircularProgress />
  }

  return (
    <SettingsForm
      key={JSON.stringify(settings.data ?? {})}
      initial={settings.data ?? {}}
      onSaved={() => qc.invalidateQueries({ queryKey: ['settings'] })}
    />
  )
}

function SettingsForm({ initial, onSaved }: { initial: Partial<TenantSettings>; onSaved: () => void }) {
  const [defaultLatitude, setDefaultLatitude] = useState(initial.defaultLatitude?.toString() ?? '')
  const [defaultLongitude, setDefaultLongitude] = useState(initial.defaultLongitude?.toString() ?? '')
  const [defaultRadiusMeters, setDefaultRadiusMeters] = useState(initial.defaultRadiusMeters?.toString() ?? '')
  const [frontendUrl, setFrontendUrl] = useState(initial.frontendUrl ?? '')
  const [apiUrl, setApiUrl] = useState(initial.apiUrl ?? '')
  const [dirty, setDirty] = useState(false)
  const [saveError, setSaveError] = useState('')

  const save = useMutation({
    mutationFn: () =>
      settingsApi.update({
        ...(defaultLatitude !== '' ? { defaultLatitude: parseFloat(defaultLatitude) } : {}),
        ...(defaultLongitude !== '' ? { defaultLongitude: parseFloat(defaultLongitude) } : {}),
        ...(defaultRadiusMeters !== '' ? { defaultRadiusMeters: parseInt(defaultRadiusMeters, 10) } : {}),
        ...(frontendUrl.trim() ? { frontendUrl: frontendUrl.trim() } : {}),
        ...(apiUrl.trim() ? { apiUrl: apiUrl.trim() } : {}),
      }),
    onSuccess: () => {
      setSaveError('')
      onSaved()
      setDirty(false)
    },
    onError: (e) => setSaveError(apiErrorMessage(e)),
  })

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Company Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Attendance geofence defaults and application URLs used in links and integrations.
      </Typography>

      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
      {save.isSuccess && <Alert severity="success" sx={{ mb: 2 }}>Settings saved.</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Attendance geolocation</Typography>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="Default latitude" type="number" value={defaultLatitude} onChange={(e) => { setDefaultLatitude(e.target.value); setDirty(true) }} fullWidth helperText="Used when a branch has no location set." />
              <TextField label="Default longitude" type="number" value={defaultLongitude} onChange={(e) => { setDefaultLongitude(e.target.value); setDirty(true) }} fullWidth />
            </Stack>
            <TextField
              label="Default radius (meters)"
              type="number"
              value={defaultRadiusMeters}
              onChange={(e) => { setDefaultRadiusMeters(e.target.value); setDirty(true) }}
              sx={{ maxWidth: 320 }}
              helperText="Geofence radius for clock-ins when a branch has no radius."
            />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Application URLs</Typography>
          <Stack spacing={2}>
            <TextField label="Frontend URL" value={frontendUrl} onChange={(e) => { setFrontendUrl(e.target.value); setDirty(true) }} helperText="Base URL of the web app, used in links." />
            <TextField label="API URL" value={apiUrl} onChange={(e) => { setApiUrl(e.target.value); setDirty(true) }} helperText="Base URL of the API, used in links." />
          </Stack>
        </CardContent>
      </Card>

      <Can permissions={['tenant.manage']}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{ mt: 2 }}
          disabled={save.isPending || !dirty}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </Can>
    </Box>
  )
}