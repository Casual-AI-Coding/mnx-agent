import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'

export default defineConfig((envConfig) => {
  const mode = envConfig.mode || 'test'
  const env = loadEnv(mode, process.cwd(), '')

  return {
    resolve: {
      conditions: ['import'],
      mainFields: ['module', 'jsnext:main', 'main'],
      extensions: ['.js', '.ts', '.tsx', '.json'],
      alias: {
        // replacement 指向目录（不是 index.ts），alias 拼接深层后缀后由 vite extensions 解析；source 模式与 vitest.config.ts 对齐
        '@mnx/shared-types/entities': resolve(__dirname, './packages/shared-types/entities'),
        '@mnx/shared-types/validation': resolve(__dirname, './packages/shared-types/validation'),
        '@mnx/shared-types/api': resolve(__dirname, './packages/shared-types/api'),
        '@mnx/shared-types': resolve(__dirname, './packages/shared-types/index.ts'),
      },
    },
    test: {
      env,
      environment: 'node',
      globals: true,
      setupFiles: ['./server/__tests__/setup.ts'],
      include: ['server/**/*.{test,spec}.ts'],
      exclude: ['node_modules', 'dist'],
      pool: 'forks',
      fileParallelism: true,
      maxWorkers: 4,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: [
          'server/services/workflow/**/*.ts',
          'server/services/cron-scheduler.ts',
          'server/services/task-executor.ts',
          'server/services/queue-processor.ts',
          'server/services/user-service.ts',
          'server/services/misfire-handler.ts',
          'server/services/capacity-checker.ts',
          'server/services/retry-manager.ts',
          'server/services/notification-service.ts',
          'server/services/concurrency-manager.ts',
          'server/services/execution-state-manager.ts',
          'server/services/service-node-registry.ts',
          'server/services/dlq-auto-retry-scheduler.ts',
          'server/services/export-service.ts',
          'server/services/domain/**/*.ts',
          'server/repositories/**/*.ts',
          'server/lib/media-storage.ts',
          'server/lib/retry.ts',
          'server/lib/minimax/index.ts',
          'server/lib/csv-utils.ts',
        ],
        exclude: [
          'server/**/*.{test,spec}.ts',
          'server/services/index.ts',
          'server/services/workflow/index.ts',
          'server/services/workflow/types.ts',
          'server/services/interfaces/**/*.ts',
          'server/services/domain/index.ts',
          'server/services/domain/interfaces/**/*.ts',
          'server/repositories/index.ts',
          'server/repositories/ports/**/*.ts',
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  }
})
