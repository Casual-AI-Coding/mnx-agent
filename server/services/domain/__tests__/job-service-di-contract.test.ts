import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('JobService DI contract', () => {
  it('不依赖 DatabaseService — 直接依赖 JobRepository', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../job.service.ts'),
      'utf-8'
    )

    // Domain JobService 应该依赖 JobRepository，不依赖 DatabaseService/God Facade
    expect(source).toContain('JobRepository')
    expect(source).not.toContain('../database/service-async')
    expect(source).not.toContain('import type { DatabaseService }')
  })
})
