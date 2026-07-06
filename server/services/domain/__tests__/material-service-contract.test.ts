import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('MaterialService 仓储化契约', () => {
  it('MaterialService 构造函数不依赖 DatabaseService', () => {
    const source = readFileSync('server/services/domain/material.service.ts', 'utf-8')
    expect(source).toContain('MaterialRepository')
    expect(source).toContain('private readonly materialRepo')
    expect(source).toContain('MaterialItemRepository')
    expect(source).toContain('PromptRepository')
    expect(source).not.toContain('private readonly db: DatabaseService')
  })
})
