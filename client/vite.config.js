import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const mock = process.env.VITE_MOCK === '1'

export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    port: 5173,
    open: true,
    proxy: mock ? undefined : {
      '/api': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
})
