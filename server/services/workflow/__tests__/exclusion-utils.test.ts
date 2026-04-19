import { describe, it, expect } from 'vitest'
import {
  updateExcludedNodes,
  excludeBranchNodes,
  addLoopBodyNodesToExcluded,
  addErrorBoundarySuccessNodesToExcluded,
  queueErrorBoundaryErrorNodes,
} from '../exclusion-utils.js'
import type { WorkflowEdge } from '../types.js'

function createEdge(overrides: Partial<WorkflowEdge> = {}): WorkflowEdge {
  return {
    id: 'e1',
    source: 'a',
    target: 'b',
    ...overrides,
  }
}

describe('exclusion-utils', () => {
  describe('updateExcludedNodes', () => {
    it('should exclude true branch when condition is false', () => {
      const edges = [
        createEdge({ id: 'e1', source: 'cond', target: 'trueNode', sourceHandle: 'true' }),
        createEdge({ id: 'e2', source: 'cond', target: 'falseNode', sourceHandle: 'false' }),
      ]
      const excluded = new Set<string>()
      updateExcludedNodes('cond', false, edges, excluded)
      expect(excluded.has('trueNode')).toBe(true)
      expect(excluded.has('falseNode')).toBe(false)
    })

    it('should exclude false branch when condition is true', () => {
      const edges = [
        createEdge({ id: 'e1', source: 'cond', target: 'trueNode', sourceHandle: 'true' }),
        createEdge({ id: 'e2', source: 'cond', target: 'falseNode', sourceHandle: 'false' }),
      ]
      const excluded = new Set<string>()
      updateExcludedNodes('cond', true, edges, excluded)
      expect(excluded.has('trueNode')).toBe(false)
      expect(excluded.has('falseNode')).toBe(true)
    })

    it('should not exclude if no matching sourceHandle', () => {
      const edges = [
        createEdge({ id: 'e1', source: 'cond', target: 'other', sourceHandle: 'default' }),
      ]
      const excluded = new Set<string>()
      updateExcludedNodes('cond', true, edges, excluded)
      expect(excluded.has('other')).toBe(false)
    })

    it('should not process edges from other nodes', () => {
      const edges = [
        createEdge({ id: 'e1', source: 'other', target: 'target', sourceHandle: 'true' }),
      ]
      const excluded = new Set<string>()
      updateExcludedNodes('cond', true, edges, excluded)
      expect(excluded.has('target')).toBe(false)
    })
  })

  describe('excludeBranchNodes', () => {
    it('should exclude single node', () => {
      const edges = [createEdge({ source: 'a', target: 'b' })]
      const excluded = new Set<string>()
      excludeBranchNodes('a', edges, excluded)
      expect(excluded.has('a')).toBe(true)
    })

    it('should exclude all downstream nodes', () => {
      const edges = [
        createEdge({ source: 'a', target: 'b' }),
        createEdge({ source: 'b', target: 'c' }),
        createEdge({ source: 'c', target: 'd' }),
      ]
      const excluded = new Set<string>()
      excludeBranchNodes('a', edges, excluded)
      expect(excluded.has('a')).toBe(true)
      expect(excluded.has('b')).toBe(true)
      expect(excluded.has('c')).toBe(true)
      expect(excluded.has('d')).toBe(true)
    })

    it('should handle diamond pattern', () => {
      const edges = [
        createEdge({ source: 'a', target: 'b' }),
        createEdge({ source: 'a', target: 'c' }),
        createEdge({ source: 'b', target: 'd' }),
        createEdge({ source: 'c', target: 'd' }),
      ]
      const excluded = new Set<string>()
      excludeBranchNodes('a', edges, excluded)
      expect(excluded.has('a')).toBe(true)
      expect(excluded.has('b')).toBe(true)
      expect(excluded.has('c')).toBe(true)
      expect(excluded.has('d')).toBe(true)
    })

    it('should handle multiple roots', () => {
      const edges = [
        createEdge({ source: 'a', target: 'c' }),
        createEdge({ source: 'b', target: 'c' }),
      ]
      const excluded = new Set<string>()
      excludeBranchNodes('a', edges, excluded)
      expect(excluded.has('a')).toBe(true)
      expect(excluded.has('c')).toBe(true)
      expect(excluded.has('b')).toBe(false)
    })

    it('should not add duplicates', () => {
      const edges = [
        createEdge({ source: 'a', target: 'b' }),
        createEdge({ source: 'b', target: 'c' }),
      ]
      const excluded = new Set<string>(['a', 'b', 'c'])
      excludeBranchNodes('a', edges, excluded)
      expect(excluded.size).toBe(3)
    })
  })

  describe('addLoopBodyNodesToExcluded', () => {
    it('should exclude loop body nodes', () => {
      const nodes = [{ id: 'loop' }]
      const edges = [
        createEdge({ source: 'loop', target: 'body1', sourceHandle: 'body' }),
        createEdge({ source: 'body1', target: 'body2' }),
      ]
      const excluded = new Set<string>()
      addLoopBodyNodesToExcluded(nodes, edges, excluded)
      expect(excluded.has('body1')).toBe(true)
      expect(excluded.has('body2')).toBe(true)
    })

    it('should not exclude non-body edges', () => {
      const nodes = [{ id: 'loop' }]
      const edges = [
        createEdge({ source: 'loop', target: 'next', sourceHandle: 'done' }),
      ]
      const excluded = new Set<string>()
      addLoopBodyNodesToExcluded(nodes, edges, excluded)
      expect(excluded.has('next')).toBe(false)
    })
  })

  describe('addErrorBoundarySuccessNodesToExcluded', () => {
    it('should exclude success branch of error boundary', () => {
      const nodes = [{ id: 'eb', type: 'errorBoundary' }]
      const edges = [
        createEdge({ source: 'eb', target: 'success1', sourceHandle: 'success' }),
        createEdge({ source: 'success1', target: 'success2' }),
      ]
      const excluded = new Set<string>()
      addErrorBoundarySuccessNodesToExcluded(nodes, edges, excluded)
      expect(excluded.has('success1')).toBe(true)
      expect(excluded.has('success2')).toBe(true)
    })

    it('should not exclude error branch', () => {
      const nodes = [{ id: 'eb', type: 'errorBoundary' }]
      const edges = [
        createEdge({ source: 'eb', target: 'error1', sourceHandle: 'error' }),
      ]
      const excluded = new Set<string>()
      addErrorBoundarySuccessNodesToExcluded(nodes, edges, excluded)
      expect(excluded.has('error1')).toBe(false)
    })

    it('should not affect non-error-boundary nodes', () => {
      const nodes = [{ id: 'action', type: 'action' }]
      const edges = [
        createEdge({ source: 'action', target: 'next', sourceHandle: 'success' }),
      ]
      const excluded = new Set<string>()
      addErrorBoundarySuccessNodesToExcluded(nodes, edges, excluded)
      expect(excluded.has('next')).toBe(false)
    })
  })

  describe('queueErrorBoundaryErrorNodes', () => {
    it('should remove error nodes from excluded and their downstream', () => {
      const edges = [
        createEdge({ source: 'eb', target: 'error1', sourceHandle: 'error' }),
        createEdge({ source: 'error1', target: 'downstream' }),
      ]
      const excluded = new Set<string>(['error1', 'downstream'])
      queueErrorBoundaryErrorNodes('eb', edges, excluded)
      expect(excluded.has('error1')).toBe(false)
      expect(excluded.has('downstream')).toBe(false)
    })

    it('should only process error handle', () => {
      const edges = [
        createEdge({ source: 'eb', target: 'success', sourceHandle: 'success' }),
      ]
      const excluded = new Set<string>(['success'])
      queueErrorBoundaryErrorNodes('eb', edges, excluded)
      expect(excluded.has('success')).toBe(true)
    })

    it('should handle multiple error branches', () => {
      const edges = [
        createEdge({ source: 'eb', target: 'err1', sourceHandle: 'error' }),
        createEdge({ source: 'eb', target: 'err2', sourceHandle: 'error' }),
        createEdge({ source: 'err1', target: 'd1' }),
        createEdge({ source: 'err2', target: 'd2' }),
      ]
      const excluded = new Set<string>(['err1', 'd1', 'err2', 'd2'])
      queueErrorBoundaryErrorNodes('eb', edges, excluded)
      expect(excluded.has('err1')).toBe(false)
      expect(excluded.has('d1')).toBe(false)
      expect(excluded.has('err2')).toBe(false)
      expect(excluded.has('d2')).toBe(false)
    })
  })
})