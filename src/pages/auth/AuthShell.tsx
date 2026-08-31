import type { ReactNode } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Zarox Connect
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {title}
          </Typography>
          {children}
        </CardContent>
      </Card>
    </Box>
  )
}
