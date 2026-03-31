import { renderHook, act } from '@testing-library/react'
import {
  useWorkflowStore,
  hasTriggerNode,
  hasActionNode,
  isValidWorkflow,
} from '../workflow'
import type { WorkflowNode, WorkflowEdge, WorkflowNodeType } from '@/types/cron'

const createMockNode = (
  id: string,
  type: WorkflowNodeType,
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
    // Reset store state
    useWorkflowStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useWorkflowStore())
      expect(result.current.nodes).toEqual([])
      expect(result.current.edges).toEqual([])
      expect(result.current.selectedNodeId).toBeNull()
      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('addNode', () => {
    it('should add a node to the workflow', () => {
      const { result } = renderHook(() => useWorkflowStore())
      const node = createMockNode('node-1', 'trigger' as WorkflowNodeType)

      act(() => {
        result.current.addNode(node)
      })

      expect(result.current.nodes).toHaveLength(1)
      expect(result.current.nodes[0].id).toBe('node-1')
      expect(result.current.isDirty).toBe(true)
    })

    it('should add multiple nodes', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.addNode(createMockNode('node-2', 'action' as WorkflowNodeType))
      })

      expect(result.current.nodes).toHaveLength(2)
    })
  })

  describe('updateNode', () => {
    it('should update an existing node', () => {
      const { result } = renderHook(() => useWorkflowStore())
      const node = createMockNode('node-1', 'trigger' as WorkflowNodeType)

      act(() => {
        result.current.addNode(node)
      })

      act(() => {
        result.current.updateNode('node-1', {
          data: { label: 'Updated Label', config: { test: true } },
        })
      })

      expect(result.current.nodes[0].data.label).toBe('Updated Label')
      expect(result.current.nodes[0].data.config).toEqual({ test: true })
      expect(result.current.isDirty).toBe(true)
    })

    it('should not affect other nodes', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.addNode(createMockNode('node-2', 'action' as WorkflowNodeType))
      })

      act(() => {
        result.current.updateNode('node-1', { data: { label: 'Updated', config: {} } })
      })

      expect(result.current.nodes[0].data.label).toBe('Updated')
      expect(result.current.nodes[1].data.label).toBe('Test Node')
    })
  })

  describe('deleteNode', () => {
    it('should delete a node', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
      })

      act(() => {
        result.current.deleteNode('node-1')
      })

      expect(result.current.nodes).toHaveLength(0)
      expect(result.current.isDirty).toBe(true)
    })

    it('should delete connected edges when deleting node', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.addNode(createMockNode('node-2', 'action' as WorkflowNodeType))
        result.current.addEdge(createMockEdge('edge-1', 'node-1', 'node-2'))
      })

      expect(result.current.edges).toHaveLength(1)

      act(() => {
        result.current.deleteNode('node-1')
      })

      expect(result.current.nodes).toHaveLength(1)
      expect(result.current.edges).toHaveLength(0)
    })

    it('should clear selection if deleted node was selected', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.setSelectedNode('node-1')
      })

      expect(result.current.selectedNodeId).toBe('node-1')

      act(() => {
        result.current.deleteNode('node-1')
      })

      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('addEdge', () => {
    it('should add an edge to the workflow', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.addNode(createMockNode('node-2', 'action' as WorkflowNodeType))
        result.current.addEdge(createMockEdge('edge-1', 'node-1', 'node-2'))
      })

      expect(result.current.edges).toHaveLength(1)
      expect(result.current.edges[0].source).toBe('node-1')
      expect(result.current.edges[0].target).toBe('node-2')
      expect(result.current.isDirty).toBe(true)
    })
  })

  describe('deleteEdge', () => {
    it('should delete an edge', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.addNode(createMockNode('node-2', 'action' as WorkflowNodeType))
        result.current.addEdge(createMockEdge('edge-1', 'node-1', 'node-2'))
      })

      act(() => {
        result.current.deleteEdge('edge-1')
      })

      expect(result.current.edges).toHaveLength(0)
      expect(result.current.isDirty).toBe(true)
    })
  })

  describe('setSelectedNode', () => {
    it('should set selected node', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setSelectedNode('node-1')
      })

      expect(result.current.selectedNodeId).toBe('node-1')
    })

    it('should clear selection with null', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.setSelectedNode('node-1')
        result.current.setSelectedNode(null)
      })

      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('reset', () => {
    it('should reset workflow to initial state', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.addNode(createMockNode('node-2', 'action' as WorkflowNodeType))
        result.current.addEdge(createMockEdge('edge-1', 'node-1', 'node-2'))
        result.current.setSelectedNode('node-1')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.nodes).toEqual([])
      expect(result.current.edges).toEqual([])
      expect(result.current.selectedNodeId).toBeNull()
      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('loadFromJson', () => {
    it('should load workflow from JSON string', () => {
      const { result } = renderHook(() => useWorkflowStore())
      const json = JSON.stringify({
        nodes: [
          createMockNode('node-1', 'trigger' as WorkflowNodeType),
          createMockNode('node-2', 'action' as WorkflowNodeType),
        ],
        edges: [createMockEdge('edge-1', 'node-1', 'node-2')],
      })

      act(() => {
        result.current.loadFromJson(json)
      })

      expect(result.current.nodes).toHaveLength(2)
      expect(result.current.edges).toHaveLength(1)
      expect(result.current.isDirty).toBe(false)
    })

    it('should handle empty nodes/edges in JSON', () => {
      const { result } = renderHook(() => useWorkflowStore())
      const json = JSON.stringify({})

      act(() => {
        result.current.loadFromJson(json)
      })

      expect(result.current.nodes).toEqual([])
      expect(result.current.edges).toEqual([])
    })

    it('should handle invalid JSON gracefully', () => {
      const { result } = renderHook(() => useWorkflowStore())
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      act(() => {
        result.current.loadFromJson('invalid json')
      })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('exportToJson', () => {
    it('should export workflow to JSON string', () => {
      const { result } = renderHook(() => useWorkflowStore())

      act(() => {
        result.current.addNode(createMockNode('node-1', 'trigger' as WorkflowNodeType))
        result.current.addNode(createMockNode('node-2', 'action' as WorkflowNodeType))
        result.current.addEdge(createMockEdge('edge-1', 'node-1', 'node-2'))
      })

      const json = result.current.exportToJson()
      const parsed = JSON.parse(json)

      expect(parsed.nodes).toHaveLength(2)
      expect(parsed.edges).toHaveLength(1)
    })
  })
})

describe('workflow validation helpers', () => {
  describe('hasTriggerNode', () => {
    it('should return true when trigger node exists', () => {
      const nodes = [createMockNode('node-1', 'trigger' as WorkflowNodeType)]
      expect(hasTriggerNode(nodes)).toBe(true)
    })

    it('should return false when no trigger node', () => {
      const nodes = [createMockNode('node-1', 'action' as WorkflowNodeType)]
      expect(hasTriggerNode(nodes)).toBe(false)
    })

    it('should return false for empty nodes', () => {
      expect(hasTriggerNode([])).toBe(false)
    })
  })

  describe('hasActionNode', () => {
    it('should return true when action node exists', () => {
      const nodes = [createMockNode('node-1', 'action' as WorkflowNodeType)]
      expect(hasActionNode(nodes)).toBe(true)
    })

    it('should return false when no action node', () => {
      const nodes = [createMockNode('node-1', 'trigger' as WorkflowNodeType)]
      expect(hasActionNode(nodes)).toBe(false)
    })
  })

  describe('isValidWorkflow', () => {
    it('should return true for valid workflow', () => {
      const nodes = [
        createMockNode('node-1', 'trigger' as WorkflowNodeType),
        createMockNode('node-2', 'action' as WorkflowNodeType),
      ]
      const edges = [createMockEdge('edge-1', 'node-1', 'node-2')]

      expect(isValidWorkflow(nodes, edges)).toBe(true)
    })

    it('should return false for empty nodes', () => {
      expect(isValidWorkflow([], [])).toBe(false)
    })

    it('should return false when missing trigger node', () => {
      const nodes = [createMockNode('node-1', 'action' as WorkflowNodeType)]
      const edges = []

      expect(isValidWorkflow(nodes, edges)).toBe(false)
    })

    it('should return false when missing action node', () => {
      const nodes = [createMockNode('node-1', 'trigger' as WorkflowNodeType)]
      const edges = []

      expect(isValidWorkflow(nodes, edges)).toBe(false)
    })

    it('should return false when nodes are not connected', () => {
      const nodes = [
        createMockNode('node-1', 'trigger' as WorkflowNodeType),
        createMockNode('node-2', 'action' as WorkflowNodeType),
        createMockNode('node-3', 'action' as WorkflowNodeType),
      ]
      // Only node-1 and node-2 are connected, node-3 is isolated
      const edges = [createMockEdge('edge-1', 'node-1', 'node-2')]

      expect(isValidWorkflow(nodes, edges)).toBe(false)
    })
  })
})