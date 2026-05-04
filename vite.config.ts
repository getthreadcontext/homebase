import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const target =
    env.VITE_CONVEX_SITE_URL || env.VITE_CONVEX_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          rewrite: (path) => {
            // Map /api/auth/callback to /auth/callback
            if (path === '/api/auth/callback') return '/auth/callback'
            if (path === '/api/auth/admin-check') return '/auth/adminCheck'
            if (path === '/api/auth/invites') return '/auth/invites'
            if (path === '/api/admin/register-if-authorized') {
              return '/admin/registerIfAuthorized'
            }
            if (path === '/api/admin/invites') return '/admin/invites'
            if (path === '/api/admin/generate-invite') return '/admin/generateInvite'
            if (path === '/api/admin/zipline-invites') return '/admin/zipline-invites'
            if (path === '/api/ids') return '/ids'
            return path.replace(/^\/api/, '')
          },
        },
      },
    },
  }
})
