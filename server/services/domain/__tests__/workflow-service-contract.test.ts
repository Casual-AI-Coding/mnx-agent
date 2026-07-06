import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'

describe('WorkflowService 仓储化契约', () => {
  it('WorkflowService 构造函数不依赖 DatabaseService', () => {
    const source = readFileSync('server/services/domain/workflow.service.ts', 'utf-8')
    expect(source).toContain('WorkflowRepository')
    expect(source).toContain('private readonly workflowRepo')
    expect(source).not.toContain('private readonly db: DatabaseService')
  })
})
