import { describe, it, expect } from 'vitest'
import {
  WorkflowParseError,
  parseWorkflowJson,
  validateWorkflow,
} from '../parser.js'
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

describe('parser utilities', () => {
  describe('WorkflowParseError', () => {
    it('should have correct name', () => {
      const error = new WorkflowParseError('test message')
      expect(error.name).toBe('WorkflowParseError')
    })

    it('should preserve message', () => {
      const error = new WorkflowParseError('custom error')
      expect(error.message).toBe('custom error')
    })
  })

  describe('parseWorkflowJson', () => {
    it('should parse valid workflow with nodes and edges', () => {
      const json = JSON.stringify({
        nodes: [createNode('a'), createNode('b')],
        edges: [{ id: 'e1', source: 'a', target: 'b' }],
      })
      const result = parseWorkflowJson(json)
      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
    })

    it('should parse workflow with nodes_json and edges_json', () => {
      const json = JSON.stringify({
        nodes_json: JSON.stringify([createNode('a')]),
        edges_json: JSON.stringify([]),
      })
      const result = parseWorkflowJson(json)
      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
    })

    it('should throw WorkflowParseError for invalid JSON syntax', () => {
      expect(() => parseWorkflowJson('not valid json')).toThrow(WorkflowParseError)
    })

    it('should throw WorkflowParseError for non-object JSON', () => {
      expect(() => parseWorkflowJson('"just a string"')).toThrow(WorkflowParseError)
    })

    it('should throw WorkflowParseError for null', () => {
      expect(() => parseWorkflowJson('null')).toThrow(WorkflowParseError)
    })

    it('should throw WorkflowParseError when missing nodes and edges', () => {
      expect(() => parseWorkflowJson('{"data": "value"}')).toThrow(WorkflowParseError)
    })

    it('should throw WorkflowParseError for invalid nodes_json', () => {
      const json = JSON.stringify({
        nodes_json: 'not json',
        edges_json: '[]',
      })
      expect(() => parseWorkflowJson(json)).toThrow(WorkflowParseError)
    })

    it('should throw WorkflowParseError for invalid edges_json', () => {
      const json = JSON.stringify({
        nodes_json: '[]',
        edges_json: 'not json',
      })
      expect(() => parseWorkflowJson(json)).toThrow(WorkflowParseError)
    })

    it('should handle non-array nodes by defaulting to empty', () => {
      const json = JSON.stringify({
        nodes: 'not array',
        edges: [],
      })
      const result = parseWorkflowJson(json)
      expect(result.nodes).toEqual([])
    })

    it('should handle non-array edges by defaulting to empty', () => {
      const json = JSON.stringify({
        nodes: [],
        edges: 'not array',
      })
      const result = parseWorkflowJson(json)
      expect(result.edges).toEqual([])
    })

    it('should coerce string nodes_json to array', () => {
      const json = JSON.stringify({
        nodes_json: '[{"id":"a","type":"action","position":{"x":0,"y":0},"data":{"label":"a","config":{}}}]',
        edges_json: '[]',
      })
      const result = parseWorkflowJson(json)
      expect(result.nodes).toHaveLength(1)
    })
  })

  describe('validateWorkflow', () => {
    it('should validate workflow with single node and no edges', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a')],
        edges: [],
      }
      expect(() => validateWorkflow(workflow)).not.toThrow()
    })

    it('should validate workflow with multiple nodes and edges', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a'), createNode('b')],
        edges: [{ id: 'e1', source: 'a', target: 'b' }],
      }
      expect(() => validateWorkflow(workflow)).not.toThrow()
    })

    it('should throw when workflow has no nodes', () => {
      const workflow: WorkflowGraph = { nodes: [], edges: [] }
      expect(() => validateWorkflow(workflow)).toThrow('Workflow must have at least one node')
    })

    it('should throw when workflow nodes is undefined', () => {
      const workflow = { nodes: undefined as unknown, edges: [] } as WorkflowGraph
      expect(() => validateWorkflow(workflow)).toThrow('Workflow must have at least one node')
    })

    it('should throw when duplicate node IDs exist', () => {
      const workflow: WorkflowGraph = {
        nodes: [
          { ...createNode('a'), id: 'duplicate' },
          { ...createNode('b'), id: 'duplicate' },
        ],
        edges: [],
      }
      expect(() => validateWorkflow(workflow)).toThrow('Duplicate node ID: duplicate')
    })

    it('should throw when edge references non-existent source', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a')],
        edges: [{ id: 'e1', source: 'nonexistent', target: 'a' }],
      }
      expect(() => validateWorkflow(workflow)).toThrow('Edge references non-existent source node: nonexistent')
    })

    it('should throw when edge references non-existent target', () => {
      const workflow: WorkflowGraph = {
        nodes: [createNode('a')],
        edges: [{ id: 'e1', source: 'a', target: 'nonexistent' }],
      }
      expect(() => validateWorkflow(workflow)).toThrow('Edge references non-existent target node: nonexistent')
    })

    it('should handle undefined edges (treat as empty)', () => {
      const workflow = {
        nodes: [createNode('a')],
        edges: undefined,
      } as unknown as WorkflowGraph
      expect(() => validateWorkflow(workflow)).not.toThrow()
    })
  })
})