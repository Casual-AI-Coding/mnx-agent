import { renderHook, act } from '@testing-library/react'
import {
  useWorkflowStore,
  hasActionNode,
  isValidWorkflow,
  serializeWorkflow,
  deserializeWorkflow,
} from '../workflow'
import type { WorkflowNode, WorkflowEdge } from '@/types/cron'

const createMockNode = (
  id: string,
  type: 'action' | 'condition' | 'loop' | 'transform',
  label: string = 'Test Node'
): WorkflowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: {
    label,
    config: {},
  },
})

const createMockEdge = (id: string, source: string, target: string): WorkflowEdge => ({
  id,
  source,
  target,
})

describe('useWorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      currentWorkflowId: null,
      currentWorkflowName: null,
      isDirty: false,
      isLoading: false,
      lastSavedAt: null,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useWorkflowStore())
      expect(result.current.currentWorkflowId).toBeNull()
      expect(result.current.currentWorkflowName).toBeNull()
      expect(result.current.isDirty).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.lastSavedAt).toBeNull()
    })
  })

  describe('setCurrentWorkflow', () => {
    it('should set current workflow id and name', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setCurrentWorkflow('workflow-1', 'Test Workflow')
      })

      expect(result.current.currentWorkflowId).toBe('workflow-1')
      expect(result.current.currentWorkflowName).toBe('Test Workflow')
      expect(result.current.isDirty).toBe(false)
    })

    it('should clear isDirty when setting workflow', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setDirty(true)
      })
      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.setCurrentWorkflow('workflow-1')
      })

      expect(result.current.isDirty).toBe(false)
    })

    it('should handle null id', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setCurrentWorkflow(null)
      })

      expect(result.current.currentWorkflowId).toBeNull()
      expect(result.current.currentWorkflowName).toBeNull()
    })
  })

  describe('setDirty', () => {
    it('should set dirty state', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setDirty(true)
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('should unset dirty state', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setDirty(true)
        result.current.setDirty(false)
      })

      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should unset loading state', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setLoading(true)
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('markSaved', () => {
    it('should clear dirty and set lastSavedAt', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setDirty(true)
        result.current.markSaved()
      })

      expect(result.current.isDirty).toBe(false)
      expect(result.current.lastSavedAt).not.toBeNull()
    })
  })

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setCurrentWorkflow('workflow-1', 'Test')
        result.current.setDirty(true)
        result.current.setLoading(true)
        result.current.markSaved()
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.currentWorkflowId).toBeNull()
      expect(result.current.currentWorkflowName).toBeNull()
      expect(result.current.isDirty).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.lastSavedAt).toBeNull()
    })
  })
})

describe('workflow validation helpers', () => {
  describe('hasActionNode', () => {
    it('should return true when action node exists', () => {
      const nodes = [createMockNode('node-1', 'action')]
      expect(hasActionNode(nodes)).toBe(true)
    })

    it('should return false when no action node', () => {
      const nodes = [createMockNode('node-1', 'condition')]
      expect(hasActionNode(nodes)).toBe(false)
    })

    it('should return false for empty nodes', () => {
      expect(hasActionNode([])).toBe(false)
    })
  })

  describe('isValidWorkflow', () => {
    it('should return true for valid workflow', () => {
      const nodes = [
        createMockNode('node-1', 'action'),
        createMockNode('node-2', 'condition'),
      ]
      const edges = [createMockEdge('edge-1', 'node-1', 'node-2')]

      expect(isValidWorkflow(nodes, edges)).toBe(true)
    })

    it('should return false for empty nodes', () => {
      expect(isValidWorkflow([], [])).toBe(false)
    })

    it('should return false when missing action node', () => {
      const nodes = [createMockNode('node-1', 'condition')]
      const edges = []

      expect(isValidWorkflow(nodes, edges)).toBe(false)
    })

    it('should return false when nodes are not connected', () => {
      const nodes = [
        createMockNode('node-1', 'action'),
        createMockNode('node-2', 'action'),
        createMockNode('node-3', 'condition'),
      ]
      const edges = [createMockEdge('edge-1', 'node-1', 'node-2')]

      expect(isValidWorkflow(nodes, edges)).toBe(false)
    })
  })
})

describe('serialization helpers', () => {
  describe('serializeWorkflow', () => {
    it('should serialize nodes and edges to JSON', () => {
      const nodes = [createMockNode('node-1', 'action')]
      const edges = [createMockEdge('edge-1', 'node-1', 'node-2')]

      const json = serializeWorkflow(nodes, edges)
      const parsed = JSON.parse(json)

      expect(parsed.nodes).toHaveLength(1)
      expect(parsed.edges).toHaveLength(1)
    })
  })

  describe('deserializeWorkflow', () => {
    it('should deserialize JSON to nodes and edges', () => {
      const json = JSON.stringify({
        nodes: [createMockNode('node-1', 'action')],
        edges: [createMockEdge('edge-1', 'node-1', 'node-2')],
      })

      const result = deserializeWorkflow(json)

      expect(result).not.toBeNull()
      expect(result!.nodes).toHaveLength(1)
      expect(result!.edges).toHaveLength(1)
    })

    it('should handle empty objects', () => {
      const json = JSON.stringify({})

      const result = deserializeWorkflow(json)

      expect(result).not.toBeNull()
      expect(result!.nodes).toEqual([])
      expect(result!.edges).toEqual([])
    })

    it('should return null for invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = deserializeWorkflow('invalid json')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
