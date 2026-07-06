import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('templates 路由 DI 契约', () => {
  it('templates 路由不直接使用 getDatabaseService', () => {
    const source = readFileSync('server/routes/templates.ts', 'utf-8')
    expect(source).toContain('getTemplateService')
    expect(source).not.toContain('getDatabaseService')
  })
})
