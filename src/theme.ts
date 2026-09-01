import { createTheme } from '@mui/material/styles'

const gradient = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #6d28d9 100%)'
const softBg = 'rgba(79, 70, 229, 0.08)'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', light: '#818cf8', dark: '#4338ca', contrastText: '#ffffff' },
    secondary: { main: '#7c3aed', light: '#a78bfa', dark: '#6d28d9', contrastText: '#ffffff' },
    info: { main: '#0ea5e9', light: '#7dd3fc', dark: '#0369a1' },
    success: { main: '#059669', light: '#6ee7b7', dark: '#047857' },
    warning: { main: '#d97706', light: '#fbbf24', dark: '#b45309' },
    error: { main: '#e11d48', light: '#fda4af', dark: '#be123c' },
    background: { default: '#f4f6fb', paper: '#ffffff' },
    divider: 'rgba(15, 23, 42, 0.08)',
    text: { primary: '#0f172a', secondary: '#5b6478' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 800, letterSpacing: '-0.01em' },
    h6: { fontWeight: 800, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '::selection': { backgroundColor: 'rgba(79, 70, 229, 0.2)' },
        '& *::-webkit-scrollbar': { width: 10, height: 10 },
        '& *::-webkit-scrollbar-thumb': { backgroundColor: '#d3d9e8', borderRadius: 8, '&:hover': { backgroundColor: '#b9c1d8' } },
        '& *::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 999,
          paddingTop: 9,
          paddingBottom: 9,
          paddingLeft: 20,
          paddingRight: 20,
          transition: 'transform .15s ease, box-shadow .15s ease, background-color .15s ease',
          '&:hover': { transform: 'translateY(-1px)' },
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            backgroundImage: gradient,
            boxShadow: '0 8px 18px -8px rgba(79, 70, 229, 0.55)',
            '&:hover': {
              backgroundImage: gradient,
              boxShadow: '0 12px 24px -8px rgba(79, 70, 229, 0.6)',
            },
          }),
          ...(ownerState.variant === 'outlined' && ownerState.color === 'primary' && {
            borderColor: 'rgba(79, 70, 229, 0.45)',
            color: '#4f46e5',
            '&:hover': {
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.06)',
            },
          }),
          ...(ownerState.variant === 'text' && ownerState.color === 'primary' && {
            color: '#4f46e5',
            '&:hover': { backgroundColor: 'rgba(79, 70, 229, 0.08)' },
          }),
        }),
        sizeLarge: { paddingTop: 12, paddingBottom: 12, paddingLeft: 26, paddingRight: 26 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(226, 232, 248, 0.9)',
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.03), 0 6px 20px -6px rgba(16, 24, 40, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
        outlined: { borderRadius: 16, backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15, 23, 42, 0.14)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a5b4fc' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4f46e5', borderWidth: 2 },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: { input: { '&::placeholder': { opacity: 0.55 } } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        colorPrimary: { backgroundColor: softBg, color: '#4338ca' },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20, backgroundImage: 'none' } },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 800 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: 16, paddingTop: 8 } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginBottom: 3,
          '& .MuiListItemIcon-root': { color: '#7a8499' },
          '&:hover': { backgroundColor: 'rgba(79, 70, 229, 0.06)' },
          '&.Mui-selected': {
            backgroundColor: softBg,
            color: '#4338ca',
            '& .MuiListItemIcon-root': { color: '#4f46e5' },
            '&:hover': { backgroundColor: 'rgba(79, 70, 229, 0.12)' },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 8, fontWeight: 500 } },
    },
    MuiAvatar: {
      styleOverrides: { root: { backgroundImage: gradient } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#44506b',
          backgroundColor: '#f8fafd',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
          '&:hover': { backgroundColor: 'rgba(79, 70, 229, 0.03) !important' },
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: { root: { backgroundColor: 'transparent' } },
    },
  },
})