import { describe, it, expect, beforeEach } from 'vitest'
import { WorkflowEngine } from '../services/workflow-engine'

describe('Workflow Engine Error Handling', () => {
  let engine: WorkflowEngine
  let mockDb: any
  let mockRegistry: any

  beforeEach(() => {
    mockDb = {} as any
    mockRegistry = {} as any
    engine = new WorkflowEngine(mockDb, mockRegistry, createMockEventBus())
  })

  it('should return specific error for malformed JSON', async () => {
    const result = await engine.executeWorkflow('invalid json')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to parse workflow JSON')
    expect(result.error).toContain('invalid JSON syntax')
  })

  it('should return specific error for missing nodes', async () => {
    const result = await engine.executeWorkflow('{"edges": []}')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid workflow JSON structure: must contain nodes and edges arrays')
  })

  it('should return specific error for duplicate node IDs', async () => {
    const workflow = JSON.stringify({
      nodes: [
        { id: 'node1', type: 'action', data: { label: 'Test', config: {} }, position: { x: 0, y: 0 } },
        { id: 'node1', type: 'action', data: { label: 'Test2', config: {} }, position: { x: 0, y: 0 } },
      ],
      edges: []
    })

    const result = await engine.executeWorkflow(workflow)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Duplicate node ID: node1')
  })
})