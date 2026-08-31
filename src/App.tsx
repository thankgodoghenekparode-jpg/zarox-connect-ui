import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createBrowserRouter, RouterProvider, useLocation, useNavigate } from 'react-router-dom'
import { theme } from './theme'
import { queryClient } from './lib/query'
import { useAuthStore } from './store/auth'
import { useTenantStore } from './store/tenant'
import { getTenantId } from './api/client'
import { AuthGuard, GuestGuard, PlatformGuard, CompanyGuard } from './router/guards'
import { PlatformLayout } from './components/layout/PlatformLayout'
import { CompanyLayout } from './components/layout/CompanyLayout'
import { LoginPage } from './pages/auth/Login'
import { RegisterPage } from './pages/auth/Register'
import { ForgotPasswordPage } from './pages/auth/ForgotPassword'
import { ResetPasswordPage } from './pages/auth/ResetPassword'
import { SelectCompanyPage } from './pages/SelectCompany'
import { PlatformDashboardPage } from './pages/platform/Dashboard'
import { TenantsPage } from './pages/platform/Tenants'
import { PlansPage } from './pages/platform/Plans'
import { UsersPage } from './pages/platform/Users'
import { SettingsPage } from './pages/platform/Settings'
import { CompanyDashboardPage } from './pages/company/Dashboard'
import { BranchesPage } from './pages/company/Branches'
import { StaffPage } from './pages/company/Staff'
import { RolesPage } from './pages/company/Roles'
import { FeaturesPlaceholderPage } from './pages/company/FeaturesPlaceholder'

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    element: <GuestGuard />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      { path: '/select-company', element: <SelectCompanyPage /> },
      {
        element: <PlatformGuard />,
        children: [
          {
            element: <PlatformLayout />,
            children: [
              { path: '/admin', element: <PlatformDashboardPage /> },
              { path: '/admin/tenants', element: <TenantsPage /> },
              { path: '/admin/plans', element: <PlansPage /> },
              { path: '/admin/users', element: <UsersPage /> },
              { path: '/admin/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
      {
        element: <CompanyGuard />,
        children: [
          {
            element: <CompanyLayout />,
            children: [
              { index: true, path: '/app', element: <CompanyDashboardPage /> },
              { path: '/app/branches', element: <BranchesPage /> },
              { path: '/app/departments', element: <FeaturesPlaceholderPage title="Departments" /> },
              { path: '/app/groups', element: <FeaturesPlaceholderPage title="Groups" /> },
              { path: '/app/staff', element: <StaffPage /> },
              { path: '/app/roles', element: <RolesPage /> },
              { path: '/app/schedules', element: <FeaturesPlaceholderPage title="Schedules" /> },
              { path: '/app/attendance', element: <FeaturesPlaceholderPage title="Attendance" /> },
              { path: '/app/chat', element: <FeaturesPlaceholderPage title="Chat" /> },
              { path: '/app/documents', element: <FeaturesPlaceholderPage title="Documents" /> },
              { path: '/app/memos', element: <FeaturesPlaceholderPage title="Memos" /> },
              { path: '/app/inventory', element: <FeaturesPlaceholderPage title="Inventory" /> },
              { path: '/app/forms', element: <FeaturesPlaceholderPage title="Forms" /> },
              { path: '/app/workflows', element: <FeaturesPlaceholderPage title="Workflows" /> },
              { path: '/app/reports', element: <FeaturesPlaceholderPage title="Reports" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <RootRedirect /> },
])

function RootRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) return
    if (!user) {
      navigate('/login', { replace: true })
    } else {
      const isPlatform = user.role === 'SUPER_ADMIN' || user.role === 'PLATFORM_SUPPORT'
      if (isPlatform) navigate('/admin', { replace: true })
      else if (getTenantId()) navigate('/app', { replace: true })
      else navigate('/select-company', { replace: true })
    }
  }, [initialized, user, navigate, location.pathname])

  return null
}

function AppBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const loadTenant = useTenantStore((s) => s.load)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (getTenantId()) void loadTenant()
  }, [loadTenant])

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AppBootstrap />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
