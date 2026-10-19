import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// The organiser console. A SEPARATE app from the team site: its own entry, build and dev server.
// It binds to 127.0.0.1 only, so it is reachable from this computer and nowhere else. It is never deployed.
// Real protection is still the database: every admin_* function rejects anyone who is not an admin.
const here = path.dirname(fileURLToPath(import.meta.url))
export default defineConfig({
  root: here,
  envDir: path.resolve(here, '..'), // reads the same .env.local as the team site
  publicDir: path.resolve(here, '../public'),
  plugins: [react()],
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'react-router-dom', '@supabase/supabase-js', 'qrcode'] },
  server: { host: '127.0.0.1', port: 5174, strictPort: true, fs: { allow: [path.resolve(here, '..')] } },
  build: { outDir: path.resolve(here, 'dist'), emptyOutDir: true },
})
