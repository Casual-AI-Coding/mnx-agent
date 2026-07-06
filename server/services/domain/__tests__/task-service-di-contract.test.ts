import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('TaskService DI contract', () => {
  it('不依赖 DatabaseService — 直接依赖 TaskRepository + DeadLetterRepository', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../task.service.ts'),
      'utf-8'
    )

    expect(source).toContain('TaskRepository')
    expect(source).toContain('DeadLetterRepository')
    expect(source).not.toContain('../database/service-async')
    expect(source).not.toContain('import type { DatabaseService }')
  })
})
