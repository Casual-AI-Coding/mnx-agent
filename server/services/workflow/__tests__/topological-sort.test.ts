import { describe, it, expect } from 'vitest'
import {
  CycleDetectedError,
  buildExecutionLayers,
  buildExecutionOrder,
  topologicalSort,
} from '../topological-sort.js'
import type { WorkflowGraph, WorkflowNode } from '../types.js'
import { WorkflowNodeType } from '../../../types/workflow.js'

function createNode(id: string): WorkflowNode {
  return {
    id,
    type: WorkflowNodeType.Action,
    position: { x: 0, y: 0 },
    data: { label: id, config: {} },
  }
}

describe('topological-sort utilities', () => {
  describe('CycleDetectedError', () => {
    it('should store nodes involved in cycle', () => {
      const error = new CycleDetectedError(['node-a', 'node-b'])
      expect(error.nodes).toEqual(['node-a', 'node-b'])
    })

    it('should have correct message format', () => {
      const error = new CycleDetectedError(['node-a', 'node-b'])
      expect(error.message).toBe('Workflow contains cycle involving nodes: node-a, node-b')
    })

    it('should have correct name', () => {
      const error = new CycleDetectedError(['node-a'])
      expect(error.name).toBe('CycleDetectedError')
    })
  })

  describe('buildExecutionLayers', () => {
    it('should return empty layers for empty workflow', () => {
      const workflow: WorkflowGraph = { nodes: [], edges: [] }
      const result = buildExecutionLayers(workflow)
      expect(result).toEqual([])
    })

    it('should return single layer for single node with no edges', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a')],
        edges: [],
      }
      const result = buildExecutionLayers(workflow)
      expect(result).toEqual([['a']])
    })

    it('should group independent nodes in same layer', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b')],
        edges: [],
      }
      const result = buildExecutionLayers(workflow)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('a')
      expect(result[0]).toContain('b')
    })

    it('should handle sequential dependencies', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b'), createNode('c')],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'c' },
        ],
      }
      const result = buildExecutionLayers(workflow)
      expect(result).toEqual([['a'], ['b'], ['c']])
    })

    it('should handle diamond dependency pattern', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b'), createNode('c'), createNode('d')],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'a', target: 'c' },
          { id: 'e3', source: 'b', target: 'd' },
          { id: 'e4', source: 'c', target: 'd' },
        ],
      }
      const result = buildExecutionLayers(workflow)
      expect(result[0]).toEqual(['a'])
      expect(result[1]).toContain('b')
      expect(result[1]).toContain('c')
      expect(result[2]).toEqual(['d'])
    })

    it('should handle multiple roots', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b'), createNode('c')],
        edges: [{ id: 'e1', source: 'a', target: 'c' }],
      }
      const result = buildExecutionLayers(workflow)
      expect(result[0]).toContain('a')
      expect(result[0]).toContain('b')
      expect(result[1]).toEqual(['c'])
    })

    it('should handle merge patterns', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b'), createNode('c')],
        edges: [
          { id: 'e1', source: 'a', target: 'c' },
          { id: 'e2', source: 'b', target: 'c' },
        ],
      }
      const result = buildExecutionLayers(workflow)
      expect(result[0]).toContain('a')
      expect(result[0]).toContain('b')
      expect(result[1]).toEqual(['c'])
    })

    it('should throw CycleDetectedError when cycle exists', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b')],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'a' },
        ],
      }
      expect(() => buildExecutionLayers(workflow)).toThrow(CycleDetectedError)
    })

    it('should throw CycleDetectedError with correct nodes', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b'), createNode('c')],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'c' },
          { id: 'e3', source: 'c', target: 'a' },
        ],
      }
      try {
        buildExecutionLayers(workflow)
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(CycleDetectedError)
        const error = e as CycleDetectedError
        expect(error.nodes.sort()).toEqual(['a', 'b', 'c'])
      }
    })
  })

  describe('buildExecutionOrder', () => {
    it('should return flat list of nodes in execution order', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b'), createNode('c')],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'c' },
        ],
      }
      const result = buildExecutionOrder(workflow)
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty workflow', () => {
      const workflow: WorkflowGraph = { nodes: [], edges: [] }
      const result = buildExecutionOrder(workflow)
      expect(result).toEqual([])
    })

    it('should handle parallel nodes', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b')],
        edges: [],
      }
      const result = buildExecutionOrder(workflow)
      expect(result).toHaveLength(2)
      expect(result).toContain('a')
      expect(result).toContain('b')
    })
  })

  describe('topologicalSort', () => {
    it('should return empty layers for empty inputs', () => {
      const result = topologicalSort([], [])
      expect(result).toEqual([])
    })

    it('should handle nodes with no edges', () => {
      const nodes = [createNode('a'), createNode('b')]
      const result = topologicalSort(nodes, [])
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('a')
      expect(result[0]).toContain('b')
    })

    it('should handle empty edges array', () => {
      const nodes = [createNode('a')]
      const result = topologicalSort(nodes, [])
      expect(result).toEqual([['a']])
    })

    it('should sort complex workflow correctly', () => {
      const nodes = [createNode('start'), createNode('task1'), createNode('task2'), createNode('end')]
      const edges = [
        { id: 'e1', source: 'start', target: 'task1' },
        { id: 'e2', source: 'start', target: 'task2' },
        { id: 'e3', source: 'task1', target: 'end' },
        { id: 'e4', source: 'task2', target: 'end' },
      ]
      const result = topologicalSort(nodes, edges)
      expect(result[0]).toEqual(['start'])
      expect(result[1]).toContain('task1')
      expect(result[1]).toContain('task2')
      expect(result[2]).toEqual(['end'])
    })
  })
})