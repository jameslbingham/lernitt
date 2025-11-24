import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// ⚠️ SECURITY CHECK: Prevent deploying with bypass enabled in production
const isProd = process.env.NODE_ENV === 'production'
const bypass =
  process.env.VITE_AUTH_BYPASS === '1' ||
  process.env.VITE_BYPASS === '1'

if (isProd && bypass) {
  throw new Error(
    "❌ BLOCKED: VITE_BYPASS or VITE_AUTH_BYPASS is enabled in production. Remove it before deploying."
  )
}

const mock = process.env.VITE_MOCK === '1'

export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: mock
      ? undefined
      : {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true
          }
        }
  }
})
