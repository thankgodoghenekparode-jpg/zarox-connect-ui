import type { MouseEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import KeyIcon from '@mui/icons-material/Key'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import HistoryIcon from '@mui/icons-material/History'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import type { SvgIconComponent } from '@mui/icons-material'
import { useAuthStore } from '../../store/auth'
import { ChangePasswordDialog } from '../account/ChangePasswordDialog'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
}

const DRAWER_WIDTH = 264
const GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #6d28d9 100%)'

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundImage: GRADIENT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.42,
        boxShadow: '0 8px 16px -6px rgba(79, 70, 229, 0.5)',
        flexShrink: 0,
      }}
    >
      Z
    </Box>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?'
}

export function AppShell({
  title,
  subtitle,
  nav,
  onNavigateHome,
  actions,
  children,
  onLogout,
}: {
  title: string
  subtitle?: string
  nav: NavItem[]
  onNavigateHome: () => void
  actions?: ReactNode
  children: ReactNode
  onLogout?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const isPlatform =
    user?.role === 'SUPER_ADMIN' || user?.role === 'PLATFORM_SUPPORT'

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2.75, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={onNavigateHome}>
        <LogoMark />
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.4 }}>
            {subtitle ?? ''}
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 1.25, py: 1.5, flex: 1, overflow: 'auto' }}>
        <Typography variant="caption" sx={{ px: 1, display: 'block', mb: 1, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary' }}>
          MENU
        </Typography>
        {nav.map((item) => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          const Icon = item.icon
          return (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              selected={active}
              onClick={() => setOpen(false)}
              sx={{ py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }} />
            </ListItemButton>
          )
        })}
      </List>
      {user && (
        <Box sx={{ m: 1.5, p: 1.25, borderRadius: 3, bgcolor: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79,70,229,0.1)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{ width: 34, height: 34, fontSize: 13 }}>{initials(`${user.firstName} ${user.lastName}`)}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{user.firstName} {user.lastName}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">{user.email}</Typography>
          </Box>
          {onLogout && (
            <Tooltip title="Logout">
              <IconButton size="small" onClick={onLogout}><LogoutIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  )

  const handleMenuOpen = (e: MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: 'rgba(15, 23, 42, 0.07)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(!open)} sx={{ mr: 0.5, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <LogoMark size={34} />
            <Box>
              <Typography variant="subtitle1" noWrap sx={{ lineHeight: 1.1 }}>{subtitle ?? title}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">{title}</Typography>
            </Box>
          </Box>
          {actions}
          {user && (
            <Box
              onClick={handleMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                pl: 0.5,
                pr: 1,
                borderRadius: 999,
                border: '1px solid',
                borderColor: 'rgba(15, 23, 42, 0.08)',
                bgcolor: '#fff',
                cursor: 'pointer',
                '&:hover': { borderColor: 'rgba(79, 70, 229, 0.4)' },
              }}
            >
              <Avatar sx={{ width: 30, height: 30, fontSize: 12 }}>{initials(`${user.firstName} ${user.lastName}`)}</Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}>
                <Typography variant="body2" fontWeight={700} noWrap>{user.firstName}</Typography>
              </Box>
              <ArrowDropDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, backgroundImage: 'none' } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, backgroundImage: 'none', borderRight: '1px solid rgba(15, 23, 42, 0.07)' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3.5 }, flex: 1 }}>{children}</Box>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 3 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight={700}>{user?.firstName} {user?.lastName}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setMenuAnchor(null); setChangePasswordOpen(true) }}>
          <ListItemIcon sx={{ minWidth: 34 }}><KeyIcon fontSize="small" /></ListItemIcon>
          Change password
        </MenuItem>
        {!isPlatform && (
          <>
            <MenuItem onClick={() => { setMenuAnchor(null); navigate('/app/account/change-email') }}>
              <ListItemIcon sx={{ minWidth: 34 }}><MailOutlineIcon fontSize="small" /></ListItemIcon>
              Change email
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); navigate('/app/account/requests') }}>
              <ListItemIcon sx={{ minWidth: 34 }}><HistoryIcon fontSize="small" /></ListItemIcon>
              My requests
            </MenuItem>
          </>
        )}
        {onLogout && (
          <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 34 }}><LogoutIcon fontSize="small" /></ListItemIcon>
            Logout
          </MenuItem>
        )}
      </Menu>
      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </Box>
  )
}