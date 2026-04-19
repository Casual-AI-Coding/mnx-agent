/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mnx/shared-types/entities': path.resolve(__dirname, './packages/shared-types/entities/index.ts'),
      '@mnx/shared-types/validation': path.resolve(__dirname, './packages/shared-types/validation/index.ts'),
      '@mnx/shared-types/api': path.resolve(__dirname, './packages/shared-types/api/index.ts'),
      '@mnx/shared-types': path.resolve(__dirname, './packages/shared-types/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [
      './server/__tests__/setup.ts',
      './src/__tests__/setup.ts',
    ],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'server/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    singleThread: true,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**', 'server/**'],
      exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    },
  },
})