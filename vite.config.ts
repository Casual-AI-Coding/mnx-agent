import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4411,
    proxy: {
      '/api': {
        target: 'http://localhost:4511',
        changeOrigin: true,
      },
    },
  },
})