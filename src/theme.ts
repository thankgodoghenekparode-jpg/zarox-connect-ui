import { createTheme } from '@mui/material/styles'

const gradient = 'linear-gradient(135deg, #3157d5 0%, #1e40af 100%)'
const softBg = 'rgba(49, 87, 213, 0.08)'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3157d5', light: '#7188e6', dark: '#2444ad', contrastText: '#ffffff' },
    secondary: { main: '#0f766e', light: '#5fb5ad', dark: '#115e59', contrastText: '#ffffff' },
    info: { main: '#0ea5e9', light: '#7dd3fc', dark: '#0369a1' },
    success: { main: '#059669', light: '#6ee7b7', dark: '#047857' },
    warning: { main: '#d97706', light: '#fbbf24', dark: '#b45309' },
    error: { main: '#e11d48', light: '#fda4af', dark: '#be123c' },
    background: { default: '#f4f6fa', paper: '#ffffff' },
    divider: '#e5e9f1',
    text: { primary: '#172033', secondary: '#667085' },
  },
  shape: { borderRadius: 10 },
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
    h1: { fontWeight: 800, letterSpacing: '-0.015em' },
    h2: { fontWeight: 800, letterSpacing: '-0.015em' },
    h3: { fontWeight: 800, letterSpacing: '-0.015em' },
    h4: { fontWeight: 800, letterSpacing: '-0.01em' },
    h5: { fontWeight: 800, letterSpacing: '-0.005em' },
    h6: { fontWeight: 800, letterSpacing: 0 },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '::selection': { backgroundColor: 'rgba(49, 87, 213, 0.18)' },
        '& *::-webkit-scrollbar': { width: 8, height: 8 },
        '& *::-webkit-scrollbar-thumb': { backgroundColor: '#cbd3e1', borderRadius: 8, '&:hover': { backgroundColor: '#aeb9ca' } },
        '& *::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 10,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 20,
          paddingRight: 20,
          maxWidth: '100%',
          whiteSpace: 'normal',
          textAlign: 'center',
          transition: 'box-shadow .15s ease, background-color .15s ease, border-color .15s ease',
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            backgroundImage: gradient,
            boxShadow: '0 6px 14px -7px rgba(49, 87, 213, 0.55)',
            '&:hover': {
              backgroundImage: gradient,
              boxShadow: '0 8px 18px -7px rgba(49, 87, 213, 0.62)',
            },
          }),
          ...(ownerState.variant === 'outlined' && ownerState.color === 'primary' && {
            borderColor: 'rgba(49, 87, 213, 0.38)',
            color: '#3157d5',
            '&:hover': {
              borderColor: '#3157d5',
              backgroundColor: 'rgba(49, 87, 213, 0.06)',
            },
          }),
          ...(ownerState.variant === 'text' && ownerState.color === 'primary' && {
            color: '#3157d5',
            '&:hover': { backgroundColor: 'rgba(49, 87, 213, 0.08)' },
          }),
        }),
        sizeLarge: { paddingTop: 12, paddingBottom: 12, paddingLeft: 26, paddingRight: 26 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid #e5e9f1',
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.02), 0 8px 24px -16px rgba(16, 24, 40, 0.18)',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 20,
          '&:last-child': { paddingBottom: 20 },
          '@media (max-width:599.95px)': {
            padding: 16,
            '&:last-child': { paddingBottom: 16 },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 14 },
        outlined: { borderRadius: 14, backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d7deea' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9aa9c2' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3157d5', borderWidth: 2 },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: { input: { '&::placeholder': { opacity: 0.55 } } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 7, fontWeight: 600 },
        colorPrimary: { backgroundColor: softBg, color: '#2444ad' },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16, backgroundImage: 'none', boxShadow: '0 20px 60px -24px rgba(15, 23, 42, 0.35)' } },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 800 } } },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 16,
          paddingTop: 8,
          flexWrap: 'wrap',
          gap: 8,
          '& > :not(style) ~ :not(style)': { marginLeft: 0 },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          marginBottom: 3,
          '& .MuiListItemIcon-root': { color: '#7a8499' },
          '&:hover': { backgroundColor: 'rgba(49, 87, 213, 0.06)' },
          '&.Mui-selected': {
            backgroundColor: softBg,
            color: '#2444ad',
            borderLeft: '3px solid #3157d5',
            paddingLeft: 13,
            '& .MuiListItemIcon-root': { color: '#3157d5' },
            '&:hover': { backgroundColor: 'rgba(49, 87, 213, 0.12)' },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 7, fontWeight: 500 } },
    },
    MuiAvatar: {
      styleOverrides: { root: { backgroundImage: gradient } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#526079',
          backgroundColor: '#f7f9fc',
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
