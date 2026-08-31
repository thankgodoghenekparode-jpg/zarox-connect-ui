import { useQuery } from '@tanstack/react-query'
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material'
import { platformApi } from '../../api/platform'
import { apiErrorMessage } from '../../api/client'

export function SettingsPage() {
  const settings = useQuery({ queryKey: ['platform', 'settings'], queryFn: () => platformApi.settings() })

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Platform Settings</Typography>
      {settings.isLoading && <CircularProgress />}
      {settings.error && <Alert severity="error">{apiErrorMessage(settings.error)}</Alert>}
      {settings.data && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(settings.data, null, 2)}</pre>
        </Paper>
      )}
    </Box>
  )
}
