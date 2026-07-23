/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // replacement 指向目录（不是 index.ts），alias 拼接深层后缀后由 vite extensions 解析；ADR-0012 修复 latent bug
      '@mnx/shared-types/entities': path.resolve(__dirname, './packages/shared-types/entities'),
      '@mnx/shared-types/validation': path.resolve(__dirname, './packages/shared-types/validation'),
      '@mnx/shared-types/api': path.resolve(__dirname, './packages/shared-types/api'),
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
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'server/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    fileParallelism: false,
    maxWorkers: 8,
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json'],
      reportsDirectory: './coverage',
      include: [
        'src/stores/**/*.ts',
        'src/settings/**/*.ts',
        'src/hooks/**/*.ts',
        'src/lib/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        'src/settings/validation/**',
        'src/settings/store/**',
        'src/settings/types/**',
        'src/types/**',
        'src/stores/index.ts',
        '**/*.types.ts',
        'src/lib/__tests__/**',
        'src/lib/**/*.d.ts',
        'src/lib/vite-env.d.ts',
        'src/lib/constants/**',
        'src/lib/api/types.ts',
      ],
      thresholds: {
        // ADR-0010 初始基线阈值：扩展到 hooks/lib 后基线为 ~45%
        // 防护阈值设 40% 防止下滑，目标通过补测试逐步提升至 70%（AGENTS.md §8 目标）
        // 后续 ADR 根据提升进度更新
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },
  },
})