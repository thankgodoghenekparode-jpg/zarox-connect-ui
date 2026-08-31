import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
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
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import type { SvgIconComponent } from '@mui/icons-material'
import { useAuthStore } from '../../store/auth'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
}

const DRAWER_WIDTH = 260

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
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" fontWeight={700} noWrap component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
          {title}
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {nav.map((item) => {
          const active = pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              selected={active}
              onClick={() => setOpen(false)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={1}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setOpen(!open)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700} onClick={onNavigateHome} sx={{ cursor: 'pointer' }}>
              {subtitle ?? title}
            </Typography>
          </Box>
          {actions}
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={onLogout} sx={{ ml: 1 }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
          <Avatar sx={{ ml: 1, width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
            {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?'}
          </Avatar>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  )
}
