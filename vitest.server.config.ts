import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    conditions: ['import'],
    mainFields: ['module', 'jsnext:main', 'main'],
    extensions: ['.js', '.ts', '.tsx', '.json'],
    alias: [
      {
        find: /^@mnx\/shared-types$/,
        replacement: resolve(__dirname, './packages/shared-types/dist/index.js'),
      },
      {
        find: /^@mnx\/shared-types\/(.+)$/,
        replacement: resolve(__dirname, './packages/shared-types/dist/$1/index.js'),
      },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./server/__tests__/setup.ts'],
    include: ['server/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
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
        'server/lib/minimax.ts',
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
})