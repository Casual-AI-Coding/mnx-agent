import * as React from 'react'
import { useNodesState, useEdgesState, addEdge, type Connection, type Edge, type Node, type OnNodesChange, type OnEdgesChange } from '@xyflow/react'
import { useWorkflowHistory } from '@/components/workflow/useWorkflowHistory'
import { useWorkflowVersions } from './useWorkflowVersions'
import { useWorkflowExecution } from './useWorkflowExecution'
import { useWorkflowValidation } from './useWorkflowValidation'
import { useWorkflowDragDrop } from './useWorkflowDragDrop'
import { storeNodeToRFNode } from '@/components/workflow/utils/workflow-transforms'
import { useWorkflowStore, isValidWorkflow, hasActionNode } from '@/stores/workflow'
import { useWorkflowUpdates } from '@/hooks/useWorkflowUpdates'
import type { WorkflowNode, WorkflowEdge } from '@/types/cron'
import type { AvailableActionItem } from '@/components/workflow/builder'

export interface SaveMessage {
  type: 'success' | 'error'
  text: string
}

export interface UseWorkflowBuilderReturn {
  // React Flow state
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange<Node>
  onEdgesChange: OnEdgesChange<Edge>

  // Selection
  selectedNode: Node | null
  setSelectedNode: React.Dispatch<React.SetStateAction<Node | null>>

  // UI Panels
  showConfigPanel: boolean
  setShowConfigPanel: React.Dispatch<React.SetStateAction<boolean>>
  showVersionPanel: boolean
  setShowVersionPanel: React.Dispatch<React.SetStateAction<boolean>>
  showTestPanel: boolean
  setShowTestPanel: React.Dispatch<React.SetStateAction<boolean>>
  showSaveModal: boolean
  setShowSaveModal: React.Dispatch<React.SetStateAction<boolean>>
  showTemplateSelector: boolean
  setShowTemplateSelector: React.Dispatch<React.SetStateAction<boolean>>
  showWorkflowSelector: boolean
  setShowWorkflowSelector: React.Dispatch<React.SetStateAction<boolean>>
  showSaveVersionModal: boolean
  setShowSaveVersionModal: React.Dispatch<React.SetStateAction<boolean>>

  // Save/Load state
  isSaving: boolean
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>
  saveMessage: SaveMessage | null
  setSaveMessage: React.Dispatch<React.SetStateAction<SaveMessage | null>>

  // Version state
  versionName: string
  setVersionName: React.Dispatch<React.SetStateAction<string>>
  versionChangeSummary: string
  setVersionChangeSummary: React.Dispatch<React.SetStateAction<string>>
  isSavingVersion: boolean
  setIsSavingVersion: React.Dispatch<React.SetStateAction<boolean>>

  // History
  canUndo: boolean
  canRedo: boolean
  handleUndo: () => void
  handleRedo: () => void

  // Actions
  onConnect: (connection: Connection) => void
  onNodeClick: (_event: React.MouseEvent, node: Node) => void
  onNodeDoubleClick: (_event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  handleConfigSave: (id: string, data: Record<string, unknown>) => void
  handleDeleteNode: (id: string) => void
  handleClear: () => void
  handleLoadNodes: (nodes: Node[], edges: Edge[]) => void

  // Drag & Drop
  onDragStart: (event: React.DragEvent, nodeType: string, actionData?: AvailableActionItem) => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void

  // Validation
  validationErrors: ReturnType<typeof useWorkflowValidation>['errors']
  validationSummary: ReturnType<typeof useWorkflowValidation>['summary']
  validationResult: ReturnType<typeof useWorkflowValidation>['validationResult']
  setValidationResult: ReturnType<typeof useWorkflowValidation>['setValidationResult']
  validate: () => void

  // Versions
  versions: ReturnType<typeof useWorkflowVersions>['versions']
  activeVersion: ReturnType<typeof useWorkflowVersions>['activeVersion']
  isLoadingVersions: ReturnType<typeof useWorkflowVersions>['isLoading']
  loadVersions: ReturnType<typeof useWorkflowVersions>['loadVersions']
  handleVersionChange: (versionId: string) => void
  handleActivateVersion: (versionId: string) => Promise<{ success: boolean; error?: string }>
  handleCreateVersion: (data: { name: string; changeSummary: string }) => Promise<{ success: boolean; error?: string }>

  // Execution
  executionId: string | null
  executionStatus: ReturnType<typeof useWorkflowExecution>['status']
  executionStartTime: Date | null
  nodeStatuses: ReturnType<typeof useWorkflowUpdates>['nodeStatuses']
  isSubscribed: ReturnType<typeof useWorkflowUpdates>['isSubscribed']
  testNodeResults: ReturnType<typeof useWorkflowExecution>['testNodeResults']
  selectedTestNode: string | null
  showNodeOutputPanel: boolean
  selectTestNode: (nodeId: string | null) => void
  showNodeOutput: (show: boolean) => void

  // Computed
  workflowIsValid: boolean
}

export function useWorkflowBuilder(workflowId: string | null): UseWorkflowBuilderReturn {
  const store = useWorkflowStore()

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // History management
  const { state, setState, undo, redo, canUndo, canRedo, reset } = useWorkflowHistory({
    nodes: [],
    edges: [],
  })

  // Sync React Flow state with history state (only on undo/redo)
  React.useEffect(() => {
    if (
      JSON.stringify(nodes) !== JSON.stringify(state.nodes) ||
      JSON.stringify(edges) !== JSON.stringify(state.edges)
    ) {
      setNodes(state.nodes)
      setEdges(state.edges)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, setNodes, setEdges])

  // Track changes for history
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setState({ nodes, edges })
    }, 300)
    return () => clearTimeout(timeout)
  }, [nodes, edges, setState])

  // Selection
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [showConfigPanel, setShowConfigPanel] = React.useState(false)

  // UI Panels
  const [showSaveModal, setShowSaveModal] = React.useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = React.useState(false)
  const [showWorkflowSelector, setShowWorkflowSelector] = React.useState(false)
  const [showVersionPanel, setShowVersionPanel] = React.useState(false)
  const [showTestPanel, setShowTestPanel] = React.useState(false)
  const [showSaveVersionModal, setShowSaveVersionModal] = React.useState(false)

  // Save/Load state
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<SaveMessage | null>(null)

  // Version state
  const [versionName, setVersionName] = React.useState('')
  const [versionChangeSummary, setVersionChangeSummary] = React.useState('')
  const [isSavingVersion, setIsSavingVersion] = React.useState(false)

  // Validation
  const {
    errors: validationErrors,
    summary: validationSummary,
    validationResult,
    setValidationResult,
    validate,
  } = useWorkflowValidation()

  // Run validation when nodes/edges change
  React.useEffect(() => {
    validate(nodes, edges)
  }, [nodes, edges, validate])

  // Update nodes with validation status
  React.useEffect(() => {
    if (validationErrors.length > 0) {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const nodeErrors = validationErrors.filter((e) => e.nodeId === node.id)
          const hasError = nodeErrors.some((e) => e.severity === 'error')
          const hasWarning = nodeErrors.some((e) => e.severity === 'warning')

          if (
            node.data.hasValidationError !== hasError ||
            node.data.hasValidationWarning !== hasWarning
          ) {
            return {
              ...node,
              data: {
                ...node.data,
                hasValidationError: hasError,
                hasValidationWarning: hasWarning,
              },
            }
          }
          return node
        })
      )
    } else {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.data.hasValidationError || node.data.hasValidationWarning) {
            return {
              ...node,
              data: {
                ...node.data,
                hasValidationError: false,
                hasValidationWarning: false,
              },
            }
          }
          return node
        })
      )
    }
  }, [validationErrors, setNodes])

  // Versions
  const {
    versions,
    activeVersion,
    isLoading: isLoadingVersions,
    loadVersions,
    handleVersionChange: handleVersionChangeBase,
    handleActivateVersion: handleActivateVersionBase,
    handleCreateVersion: handleCreateVersionBase,
  } = useWorkflowVersions({ workflowId })

  const handleVersionChange = React.useCallback(
    (versionId: string) => {
      handleVersionChangeBase(versionId, versions, {
        setNodes,
        setEdges,
        onResetHistory: () => reset({ nodes: [], edges: [] }),
      })
    },
    [handleVersionChangeBase, versions, setNodes, setEdges, reset]
  )

  const handleActivateVersion = React.useCallback(
    async (versionId: string): Promise<{ success: boolean; error?: string }> => {
      if (!workflowId) return { success: false, error: 'No workflow ID' }
      const result = await handleActivateVersionBase(workflowId, versionId)
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Version activated successfully!' })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to activate version' })
        setTimeout(() => setSaveMessage(null), 3000)
      }
      return result
    },
    [handleActivateVersionBase, workflowId]
  )

  const handleCreateVersion = React.useCallback(
    async (data: { name: string; changeSummary: string }): Promise<{ success: boolean; error?: string }> => {
      if (!workflowId) return { success: false, error: 'No workflow ID' }
      setIsSavingVersion(true)
      const result = await handleCreateVersionBase(workflowId, {
        name: data.name,
        changeSummary: data.changeSummary,
        nodes,
        edges,
      })
      setIsSavingVersion(false)
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Version saved successfully!' })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save version' })
        setTimeout(() => setSaveMessage(null), 3000)
      }
      return result
    },
    [handleCreateVersionBase, workflowId, nodes, edges]
  )

  // Execution
  const {
    executionId,
    status: executionStatus,
    startTime: executionStartTime,
    testNodeResults,
    selectedTestNode,
    showNodeOutputPanel,
    selectTestNode,
    showNodeOutput,
    pause,
    resume,
    cancel,
  } = useWorkflowExecution()

  // WebSocket updates
  const { nodeStatuses, isSubscribed } = useWorkflowUpdates({
    executionId: executionId ?? undefined,
    workflowId: workflowId ?? undefined,
    enabled: !!executionId || !!workflowId,
  })

  // Update nodes with execution status
  React.useEffect(() => {
    if (nodeStatuses.size === 0) return

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const status = nodeStatuses.get(node.id)
        if (!status) return node

        return {
          ...node,
          data: {
            ...node.data,
            executionStatus: status.status,
            executionError: status.errorMessage,
            executionResult: status.result,
          },
        }
      })
    )
  }, [nodeStatuses, setNodes])

  // Load versions when workflowId changes
  React.useEffect(() => {
    if (workflowId) {
      loadVersions(workflowId)
    }
  }, [workflowId, loadVersions])

  // History actions
  const handleUndo = React.useCallback(() => {
    undo()
    setNodes(state.nodes)
    setEdges(state.edges)
  }, [undo, state, setNodes, setEdges])

  const handleRedo = React.useCallback(() => {
    redo()
    setNodes(state.nodes)
    setEdges(state.edges)
  }, [redo, state, setNodes, setEdges])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Connection handler
  const onConnect = React.useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `edge-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
      }
      setEdges((eds) => addEdge(newEdge, eds))
      store.setDirty(true)
    },
    [setEdges, store]
  )

  // Node click handlers
  const onNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
      setShowConfigPanel(true)
    },
    []
  )

  const onNodeDoubleClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
      setShowConfigPanel(true)
    },
    []
  )

  const onPaneClick = React.useCallback(() => {
    setShowConfigPanel(false)
    setSelectedNode(null)
  }, [])

  // Config handlers
  const handleConfigSave = React.useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data }
          }
          return node
        })
      )
      store.setDirty(true)
    },
    [setNodes, store]
  )

  const handleDeleteNode = React.useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== id))
      setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id))
      setShowConfigPanel(false)
      setSelectedNode(null)
      store.setDirty(true)
    },
    [setNodes, setEdges, store]
  )

  // Clear handler
  const handleClear = React.useCallback(() => {
    if (confirm('Are you sure you want to clear all nodes and edges?')) {
      setNodes([])
      setEdges([])
      reset({ nodes: [], edges: [] })
      setShowConfigPanel(false)
      setSelectedNode(null)
      store.setDirty(true)
    }
  }, [setNodes, setEdges, reset, store])

  // Load nodes handler (for external loading)
  const handleLoadNodes = React.useCallback(
    (loadedNodes: Node[], loadedEdges: Edge[]) => {
      setNodes(loadedNodes)
      setEdges(loadedEdges)
      reset({ nodes: loadedNodes, edges: loadedEdges })
    },
    [setNodes, setEdges, reset]
  )

  // Drag & Drop
  const { onDragStart, onDragOver, onDrop: onDropBase } = useWorkflowDragDrop()

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      onDropBase(event, {
        setNodes,
        onDirty: () => store.setDirty(true),
      })
    },
    [onDropBase, setNodes, store]
  )

  // Validation handler
  const validateWorkflow = React.useCallback(() => {
    const storeNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type as WorkflowNode['type'],
      position: node.position,
      data: {
        label: (node.data as Record<string, unknown>).label as string || (node.type as string),
        config: node.data as Record<string, unknown>,
      },
    })) as WorkflowNode[]

    const storeEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })) as WorkflowEdge[]

    const valid = isValidWorkflow(storeNodes, storeEdges)
    const hasAction = hasActionNode(storeNodes)

    let message = ''
    if (valid) {
      message = 'Workflow is valid!'
    } else if (storeNodes.length === 0) {
      message = 'Workflow is empty. Add some nodes first.'
    } else if (!hasAction) {
      message = 'Missing action node. Add an action to process the workflow.'
    } else {
      message = 'Some nodes are not connected. Connect all nodes.'
    }

    setValidationResult({ valid, message })
    setTimeout(() => setValidationResult(null), 3000)
  }, [nodes, edges, setValidationResult])

  // Computed values
  const workflowIsValid = React.useMemo(() => {
    const storeNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type as WorkflowNode['type'],
      position: node.position,
      data: {
        label: (node.data as Record<string, unknown>).label as string || (node.type as string),
        config: node.data as Record<string, unknown>,
      },
    })) as WorkflowNode[]

    const storeEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })) as WorkflowEdge[]

    return isValidWorkflow(storeNodes, storeEdges)
  }, [nodes, edges])

  return {
    // React Flow state
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,

    // Selection
    selectedNode,
    setSelectedNode,

    // UI Panels
    showConfigPanel,
    setShowConfigPanel,
    showVersionPanel,
    setShowVersionPanel,
    showTestPanel,
    setShowTestPanel,
    showSaveModal,
    setShowSaveModal,
    showTemplateSelector,
    setShowTemplateSelector,
    showWorkflowSelector,
    setShowWorkflowSelector,
    showSaveVersionModal,
    setShowSaveVersionModal,

    // Save/Load state
    isSaving,
    setIsSaving,
    saveMessage,
    setSaveMessage,

    // Version state
    versionName,
    setVersionName,
    versionChangeSummary,
    setVersionChangeSummary,
    isSavingVersion,
    setIsSavingVersion,

    // History
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,

    // Actions
    onConnect,
    onNodeClick,
    onNodeDoubleClick,
    onPaneClick,
    handleConfigSave,
    handleDeleteNode,
    handleClear,
    handleLoadNodes,

    // Drag & Drop
    onDragStart,
    onDragOver,
    onDrop,

    // Validation
    validationErrors,
    validationSummary,
    validationResult,
    setValidationResult,
    validate: validateWorkflow,

    // Versions
    versions,
    activeVersion,
    isLoadingVersions,
    loadVersions,
    handleVersionChange,
    handleActivateVersion,
    handleCreateVersion,

    // Execution
    executionId,
    executionStatus,
    executionStartTime,
    nodeStatuses,
    isSubscribed,
    testNodeResults,
    selectedTestNode,
    showNodeOutputPanel,
    selectTestNode,
    showNodeOutput,

    // Computed
    workflowIsValid,
  }
}
