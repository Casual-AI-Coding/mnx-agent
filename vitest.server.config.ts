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
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.{test,spec}.ts', 'server/index.ts'],
    },
  },
})