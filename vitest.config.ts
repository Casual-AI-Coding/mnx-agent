/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [
      './server/__tests__/setup.ts',
      './src/__tests__/setup.ts',
    ],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'server/**/__tests__/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.next'],
  },
}))