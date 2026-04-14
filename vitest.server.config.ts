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
    fileParallelism: false,
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
        'server/repositories/**/*.ts',
        'server/lib/media-storage.ts',
      ],
      exclude: [
        'server/**/*.{test,spec}.ts',
        'server/services/index.ts',
        'server/services/workflow/index.ts',
        'server/services/workflow/types.ts',
        'server/services/interfaces/**/*.ts',
        'server/repositories/index.ts',
        'server/repositories/ports/**/*.ts',
      ],
      thresholds: {
        lines: 54,
        functions: 54,
        branches: 45,
        statements: 54,
      },
    },
  },
})