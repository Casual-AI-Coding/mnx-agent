import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Workflows route DI contract', () => {
  it('resolves workflow services through service registration instead of constructing them in the route', async () => {
    const source = await readFile('server/routes/workflows.ts', 'utf8')

    expect(source).toContain('getWorkflowService')
    expect(source).toContain('getWorkflowEngineService')
    expect(source).not.toContain('new WorkflowService')
    expect(source).not.toContain('new WorkflowEngine')
  })
})
