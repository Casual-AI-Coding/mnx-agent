import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

const isAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    react(),
    ...(isAnalyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mnx/shared-types': path.resolve(__dirname, './packages/shared-types/dist/index.js'),
      '@mnx/shared-types/entities': path.resolve(__dirname, './packages/shared-types/dist/entities/index.js'),
      '@mnx/shared-types/validation': path.resolve(__dirname, './packages/shared-types/dist/validation/index.js'),
      '@mnx/shared-types/api': path.resolve(__dirname, './packages/shared-types/dist/api/index.js'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          flow: ['@xyflow/react'],
          animation: ['framer-motion'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 4311,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4511',
        changeOrigin: true,
      },
    },
  },
})