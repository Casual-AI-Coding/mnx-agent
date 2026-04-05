import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  Panel,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CheckCircle,
  AlertCircle,
  History,
  GitCommit,
  Bug,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { DelayNode } from '@/components/workflow/nodes/DelayNode'
import { ErrorBoundaryNode } from '@/components/workflow/nodes/ErrorBoundaryNode'
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'
import {
  WorkflowToolbar,
  WorkflowNodePalette,
  WorkflowConfigPanel,
  WorkflowVersionPanel,
  ExecutionStatusPanel,
} from '@/components/workflow/builder'
import type { AvailableActionItem } from '@/components/workflow/builder'
import type { WorkflowVersion } from '@/lib/api/workflows'
import { SaveWorkflowModal } from '@/components/workflow/SaveWorkflowModal'
import { WorkflowSelectorModal } from '@/components/workflow/TemplateSelectorModal'
import { TestRunPanel } from '@/components/workflow/TestRunPanel'
import { NodeOutputPanel } from '@/components/workflow/NodeOutputPanel'
import { useWorkflowStore, isValidWorkflow, hasActionNode } from '@/stores/workflow'
import { useWorkflowUpdates } from '@/hooks/useWorkflowUpdates'
import { getWebSocketClient } from '@/lib/websocket-client'
import type { WebSocketEvent, WorkflowTestEventPayload, WorkflowNodeOutputPayload } from '@/lib/websocket-client'
import type { WorkflowNode, WorkflowEdge } from '@/types/cron'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { validateWorkflow } from '@/lib/workflow-validation'
import {
  getWorkflowVersions,
  getActiveVersion,
  activateVersion,
  createVersion,
} from '@/lib/api/workflows'
import {
  pauseExecution,
  resumeExecution,
  cancelExecution,
} from '@/lib/api/cron'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'

interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  owner_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

// Node Types Registry
const nodeTypes: NodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
  delay: DelayNode,
  errorBoundary: ErrorBoundaryNode,
}

// Default configurations for each node type
const getDefaultConfig = (type: string, actionData?: AvailableActionItem): Record<string, unknown> => {
  switch (type) {
    case 'action':
      return {
        label: actionData?.label || 'Action',
        config: {
          service: actionData?.service || '',
          method: actionData?.method || '',
          args: [],
        },
      }
    case 'condition':
      return {
        conditionType: 'equals',
        serviceType: 'text',
        threshold: 0,
        label: 'Condition',
      }
    case 'loop':
      return {
        condition: '',
        maxIterations: 100,
        label: 'Loop',
      }
    case 'transform':
      return {
        transformType: 'map',
        mapping: {},
        inputType: '',
        outputType: '',
        label: 'Transform',
      }
    case 'delay':
      return {
        duration: 1000,
        label: 'Delay',
      }
    case 'errorBoundary':
      return {
        label: 'Error Boundary',
      }
    default:
      return { label: type }
  }
}

// Convert store node to React Flow node
const storeNodeToRFNode = (node: WorkflowNode): Node => ({
  id: node.id,
  type: node.type,
  position: node.position,
  data: {
    ...node.data,
    label: node.data?.label || node.id,
    config: node.data?.config || {},
  },
  selected: false,
})

// Convert React Flow node to store node
const rfNodeToStoreNode = (node: Node): WorkflowNode => ({
  id: node.id,
  type: node.type as WorkflowNode['type'],
  position: node.position,
  data: {
    label: (node.data as Record<string, unknown>).label as string || node.type as string,
    config: node.data as Record<string, unknown>,
  },
})

// Main Workflow Builder Component
function WorkflowBuilderInner() {
  const [searchParams] = useSearchParams()
  const { screenToFlowPosition } = useReactFlow()
  const store = useWorkflowStore()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [showConfigPanel, setShowConfigPanel] = React.useState(false)
  const [validationResult, setValidationResult] = React.useState<{ valid: boolean; message: string } | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showSaveModal, setShowSaveModal] = React.useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = React.useState(false)
  const [showWorkflowSelector, setShowWorkflowSelector] = React.useState(false)

  // Version management state
  const [versions, setVersions] = React.useState<WorkflowVersion[]>([])
  const [activeVersion, setActiveVersion] = React.useState<WorkflowVersion | null>(null)
  const [isLoadingVersions, setIsLoadingVersions] = React.useState(false)
  const [showVersionPanel, setShowVersionPanel] = React.useState(false)
  const [showSaveVersionModal, setShowSaveVersionModal] = React.useState(false)
  const [versionChangeSummary, setVersionChangeSummary] = React.useState('')
  const [versionName, setVersionName] = React.useState('')
  const [isSavingVersion, setIsSavingVersion] = React.useState(false)

  // Execution state
  const [currentExecutionId, setCurrentExecutionId] = React.useState<string | null>(null)
  const [executionStartTime, setExecutionStartTime] = React.useState<Date | null>(null)
  const [executionStatus, setExecutionStatus] = React.useState<'idle' | 'running' | 'completed' | 'paused'>('idle')

  const [history, setHistory] = React.useState<{ past: { nodes: Node[], edges: Edge[] }[], future: { nodes: Node[], edges: Edge[] }[] }>({ past: [], future: [] })

  const [validationErrors, setValidationErrors] = React.useState<ReturnType<typeof validateWorkflow>>([])
  const [validationSummary, setValidationSummary] = React.useState<{ total: number; errors: number; warnings: number }>({ total: 0, errors: 0, warnings: 0 })

  const [showTestPanel, setShowTestPanel] = React.useState(false)
  const [testNodeResults, setTestNodeResults] = React.useState<Map<string, { input?: unknown; output?: unknown; error?: string; duration?: number }>>(new Map())
  const [selectedTestNode, setSelectedTestNode] = React.useState<string | null>(null)
  const [showNodeOutputPanel, setShowNodeOutputPanel] = React.useState(false)

  React.useEffect(() => {
    const client = getWebSocketClient()
    if (!client) return

    const unsubscribe = client.onEvent('workflows', (event: WebSocketEvent) => {
      switch (event.type) {
        case 'workflow_test_started': {
          const payload = event.payload as WorkflowTestEventPayload
          setCurrentExecutionId(payload.executionId)
          setExecutionStatus('running')
          setExecutionStartTime(new Date())
          setTestNodeResults(new Map())
          break
        }
        case 'workflow_test_completed': {
          const payload = event.payload as WorkflowTestEventPayload
          setExecutionStatus(payload.status === 'failed' ? 'idle' : 'completed')
          break
        }
        case 'workflow_node_output': {
          const payload = event.payload as WorkflowNodeOutputPayload
          setTestNodeResults((prev) => {
            const next = new Map(prev)
            next.set(payload.nodeId, {
              output: payload.output,
              duration: payload.duration,
            })
            return next
          })
          break
        }
      }
    })

    return () => unsubscribe()
  }, [])

  React.useEffect(() => {
    const storeNodes = nodes.map(rfNodeToStoreNode)
    const storeEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))

    const errors = validateWorkflow(storeNodes as WorkflowNode[], storeEdges as WorkflowEdge[])
    setValidationErrors(errors)

    const errorCount = errors.filter(e => e.severity === 'error').length
    const warningCount = errors.filter(e => e.severity === 'warning').length
    setValidationSummary({
      total: errors.length,
      errors: errorCount,
      warnings: warningCount,
    })

    // Update nodes with validation status for visual indicators
    if (errors.length > 0) {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const nodeErrors = errors.filter(e => e.nodeId === node.id)
          const hasError = nodeErrors.some(e => e.severity === 'error')
          const hasWarning = nodeErrors.some(e => e.severity === 'warning')

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
  }, [nodes, edges])

  const workflowId = searchParams.get('id')
  const { nodeStatuses, isSubscribed } = useWorkflowUpdates({
    executionId: currentExecutionId ?? undefined,
    workflowId: workflowId ?? undefined,
    enabled: !!currentExecutionId || !!workflowId,
  })

  // Load versions when workflowId changes
  React.useEffect(() => {
    const workflowId = searchParams.get('id')
    if (workflowId) {
      loadVersions(workflowId)
    }
  }, [searchParams])

  const loadVersions = async (templateId: string) => {
    setIsLoadingVersions(true)
    try {
      const [versionsResult, activeResult] = await Promise.all([
        getWorkflowVersions(templateId),
        getActiveVersion(templateId),
      ])
      if (versionsResult.success && versionsResult.data) {
        setVersions(versionsResult.data)
      }
      if (activeResult.success && activeResult.data) {
        setActiveVersion(activeResult.data)
      }
    } catch (err) {
      console.error('Failed to load versions:', err)
    }
    setIsLoadingVersions(false)
  }

  const handleVersionChange = async (versionId: string) => {
    const version = versions.find((v) => v.id === versionId)
    if (!version) return

    const nodesData = typeof version.nodes_json === 'string'
      ? JSON.parse(version.nodes_json)
      : version.nodes_json
    const edgesData = typeof version.edges_json === 'string'
      ? JSON.parse(version.edges_json)
      : version.edges_json

    setNodes(nodesData.map(storeNodeToRFNode))
    setEdges(edgesData as Edge[])
    setHistory({ past: [], future: [] })
    setActiveVersion(version)
  }

  const handleActivateVersion = async (versionId: string) => {
    const workflowId = searchParams.get('id')
    if (!workflowId) return

    try {
      const result = await activateVersion(workflowId, versionId)
      if (result.success) {
        await loadVersions(workflowId)
        setSaveMessage({ type: 'success', text: 'Version activated successfully!' })
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to activate version' })
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to activate version' })
    }
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleSaveVersion = () => {
    setVersionChangeSummary('')
    setVersionName('')
    setShowSaveVersionModal(true)
  }

  const handleCreateVersion = async () => {
    const workflowId = searchParams.get('id')
    if (!workflowId) return

    setIsSavingVersion(true)
    try {
      const result = await createVersion(workflowId, {
        nodes_json: JSON.stringify(nodes.map(rfNodeToStoreNode)),
        edges_json: JSON.stringify(edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        }))),
        name: versionName || undefined,
        change_summary: versionChangeSummary || undefined,
      })

      if (result.success && result.data) {
        await loadVersions(workflowId)
        setSaveMessage({ type: 'success', text: 'Version saved successfully!' })
        setShowSaveVersionModal(false)
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save version' })
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to save version' })
    }
    setIsSavingVersion(false)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  React.useEffect(() => {
    if (nodeStatuses.size === 0) return

    const statusArray = Array.from(nodeStatuses.values())
    const hasRunning = statusArray.some((s) => s.status === 'running')
    const hasError = statusArray.some((s) => s.status === 'error')
    const allCompleted = nodeStatuses.size > 0 && statusArray.every((s) => s.status === 'completed')

    if (hasRunning) {
      setExecutionStatus('running')
    } else if (hasError) {
      setExecutionStatus('idle')
    } else if (allCompleted) {
      setExecutionStatus('completed')
    }

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
  }, [nodeStatuses])

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  const handleUndo = React.useCallback(() => {
    if (history.past.length === 0) return
    const previous = history.past[history.past.length - 1]
    setHistory(h => ({ past: h.past.slice(0, -1), future: [{ nodes, edges }, ...h.future] }))
    setNodes(previous.nodes)
    setEdges(previous.edges)
  }, [history, nodes, edges, setNodes, setEdges])

  const handleRedo = React.useCallback(() => {
    if (history.future.length === 0) return
    const next = history.future[0]
    setHistory(h => ({ past: [...h.past, { nodes, edges }], future: h.future.slice(1) }))
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [history, nodes, edges, setNodes, setEdges])

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

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setHistory(h => {
        if (h.past.length > 0) {
          const last = h.past[h.past.length - 1]
          const isSame = JSON.stringify(last.nodes) === JSON.stringify(nodes) &&
                        JSON.stringify(last.edges) === JSON.stringify(edges)
          if (isSame) return h
        }
        return {
          past: [...h.past, { nodes, edges }].slice(-50),
          future: []
        }
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [nodes, edges])

  // Load workflow by ID from URL query parameter
  React.useEffect(() => {
    const workflowId = searchParams.get('id')
    if (workflowId) {
      const loadWorkflow = async () => {
        try {
          const result = await apiClient.get(`/workflows/${workflowId}`) as { data: WorkflowTemplate }
          const workflow = result.data

          if (workflow) {
            const nodesRaw = workflow.nodes_json
            const edgesRaw = workflow.edges_json

            if (!nodesRaw) {
              console.error('No nodes_json in workflow')
              return
            }

            const nodesData = typeof nodesRaw === 'string'
              ? JSON.parse(nodesRaw)
              : nodesRaw
            const edgesData = edgesRaw
              ? (typeof edgesRaw === 'string' ? JSON.parse(edgesRaw) : edgesRaw)
              : []

            setNodes(nodesData.map(storeNodeToRFNode))
            setEdges(edgesData as Edge[])
            store.setCurrentWorkflow(workflowId, workflow.name)
          }
        } catch (err) {
          console.error('Failed to load workflow:', err)
        }
      }
      loadWorkflow()
    }
  }, [searchParams, store])

  // Drag handlers
  const onDragStart = (event: React.DragEvent, nodeType: string, actionData?: AvailableActionItem) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType,
      actionData,
    }))
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()

    const dataStr = event.dataTransfer.getData('application/reactflow')
    if (!dataStr) return

    let dragData: { type: string; actionData?: AvailableActionItem }
    try {
      dragData = JSON.parse(dataStr)
    } catch {
      dragData = { type: dataStr }
    }

    const { type: nodeType, actionData } = dragData

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    const newNode: Node = {
      id: `${nodeType}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      type: nodeType,
      position,
      data: getDefaultConfig(nodeType, actionData),
    }

    setNodes((nds) => [...nds, newNode])
    store.setDirty(true)
  }

  const onConnect = (connection: Connection) => {
    const newEdge: Edge = {
      id: `edge-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
    }
    setEdges((eds) => addEdge(newEdge, eds))
    store.setDirty(true)
  }

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setShowConfigPanel(true)
  }

  const onNodeDoubleClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setShowConfigPanel(true)
  }

  const onPaneClick = () => {
    setShowConfigPanel(false)
    setSelectedNode(null)
  }

  const handleConfigSave = (id: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data }
        }
        return node
      })
    )
    store.setDirty(true)
  }

  const handleDeleteNode = (id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id))
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id))
    setShowConfigPanel(false)
    setSelectedNode(null)
    store.setDirty(true)
  }

  const handleSave = () => {
    const json = JSON.stringify({
      nodes: nodes.map(rfNodeToStoreNode),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      }))
    }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        if (data.nodes) {
          setNodes(data.nodes.map(storeNodeToRFNode))
        }
        if (data.edges) {
          setEdges(data.edges as Edge[])
        }
        store.setDirty(true)
      } catch (err) {
        console.error('Failed to parse workflow JSON:', err)
      }
    }
    input.click()
  }

  const handleSaveToServer = async () => {
    setShowSaveModal(true)
  }

  const handleSaveWorkflow = async (name: string) => {
    setShowSaveModal(false)
    setIsSaving(true)
    try {
      const result = await apiClient.post('/workflows', {
        name,
        description: '',
        nodes_json: JSON.stringify(nodes.map(rfNodeToStoreNode)),
        edges_json: JSON.stringify(edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        }))),
        is_template: true,
      }) as { success: boolean; data?: { id: string; name: string }; error?: string }

      if (result.success && result.data) {
        store.setCurrentWorkflow(result.data.id, result.data.name)
        store.markSaved()
        setSaveMessage({ type: 'success', text: 'Workflow saved successfully!' })
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save workflow' })
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Network error' })
    }
    setIsSaving(false)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleSelectTemplate = (_templateId: string, template: WorkflowTemplate) => {
    const nodesData = typeof template.nodes_json === 'string'
      ? JSON.parse(template.nodes_json)
      : template.nodes_json
    const edgesData = typeof template.edges_json === 'string'
      ? JSON.parse(template.edges_json)
      : template.edges_json

    setNodes(nodesData.map(storeNodeToRFNode))
    setEdges(edgesData as Edge[])
    store.setCurrentWorkflow(template.id, template.name)
    setShowTemplateSelector(false)
  }

  const handleLoadFromServer = async () => {
    setShowWorkflowSelector(true)
  }

  const handleSelectWorkflow = (_templateId: string, template: WorkflowTemplate) => {
    const nodesData = typeof template.nodes_json === 'string'
      ? JSON.parse(template.nodes_json)
      : template.nodes_json
    const edgesData = typeof template.edges_json === 'string'
      ? JSON.parse(template.edges_json)
      : template.edges_json

    setNodes(nodesData.map(storeNodeToRFNode))
    setEdges(edgesData as Edge[])
    setHistory({ past: [], future: [] })
    store.setCurrentWorkflow(template.id, template.name)
    setShowWorkflowSelector(false)
  }

  const handleValidate = () => {
    const storeNodes = nodes.map(rfNodeToStoreNode)
    const storeEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))

    const valid = isValidWorkflow(storeNodes as WorkflowNode[], storeEdges as WorkflowEdge[])
    const hasAction = hasActionNode(storeNodes as WorkflowNode[])

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
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all nodes and edges?')) {
      setNodes([])
      setEdges([])
      setHistory({ past: [], future: [] })
      setShowConfigPanel(false)
      setSelectedNode(null)
      store.setDirty(true)
    }
  }

  const workflowIsValid = isValidWorkflow(
    nodes.map(rfNodeToStoreNode) as WorkflowNode[],
    edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })) as WorkflowEdge[]
  )

  return (
    <div className="-m-8 h-[calc(100vh-60px-2rem)] flex flex-col bg-background overflow-hidden">
      <WorkflowToolbar
        onSave={handleSave}
        onSaveToServer={handleSaveToServer}
        onLoad={handleLoad}
        onLoadFromServer={handleLoadFromServer}
        onValidate={handleValidate}
        onClear={handleClear}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSaveVersion={handleSaveVersion}
        onToggleVersionPanel={() => setShowVersionPanel(!showVersionPanel)}
        onTestRun={() => setShowTestPanel(!showTestPanel)}
        canUndo={canUndo}
        canRedo={canRedo}
        isValid={workflowIsValid}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        isSaving={isSaving}
        validationSummary={validationSummary}
        currentTemplateId={searchParams.get('id') ?? undefined}
        versions={versions}
        activeVersion={activeVersion}
        onVersionChange={handleVersionChange}
        isLoadingVersions={isLoadingVersions}
        hasWorkflowId={!!searchParams.get('id')}
      />

      {saveMessage && (
        <div className={cn(
          'absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-sm font-medium',
          saveMessage.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-destructive/90 text-white'
        )}>
          {saveMessage.text}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <WorkflowNodePalette onDragStart={onDragStart} />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              style: { strokeWidth: 2 },
              type: 'smoothstep',
            }}
            className="bg-background"
          >
            <Controls className="bg-secondary border border-border rounded-md" />
            <MiniMap
              className="bg-muted/30 border border-border rounded-md"
              nodeColor={(node) => {
                const nodeData = node.data as { executionStatus?: string } | undefined
                switch (nodeData?.executionStatus) {
                  case 'running':
                    return '#3b82f6'
                  case 'completed':
                    return '#22c55e'
                  case 'error':
                    return '#ef4444'
                  default:
                    break
                }
                switch (node.type) {
                  case 'action':
                    return '#3b82f6'
                  case 'loop':
                    return '#a855f7'
                  case 'condition':
                    return '#f59e0b'
                  case 'transform':
                    return '#6366f1'
                  case 'errorBoundary':
                    return '#14b8a6'
                  default:
                    return '#71717a'
                }
              }}
              maskColor="rgba(0, 0, 0, 0.8)"
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#374151" />

            <ExecutionStatusPanel
              executionId={currentExecutionId}
              status={executionStatus}
              nodeStatuses={nodeStatuses}
              startTime={executionStartTime}
              isSubscribed={isSubscribed}
              onPause={() => {
                if (!currentExecutionId) return
                pauseExecution(currentExecutionId).then((response) => {
                  if (response.success) {
                    toast.success('Execution paused')
                    setExecutionStatus('paused')
                  } else {
                    toast.error(response.error || 'Failed to pause')
                  }
                })
              }}
              onResume={() => {
                if (!currentExecutionId) return
                resumeExecution(currentExecutionId).then((response) => {
                  if (response.success) {
                    toast.success('Execution resumed')
                    setExecutionStatus('running')
                  } else {
                    toast.error(response.error || 'Failed to resume')
                  }
                })
              }}
              onCancel={() => {
                if (!currentExecutionId) return
                cancelExecution(currentExecutionId).then((response) => {
                  if (response.success) {
                    toast.success('Execution cancelled')
                    setExecutionStatus('idle')
                    setCurrentExecutionId(null)
                    setExecutionStartTime(null)
                  } else {
                    toast.error(response.error || 'Failed to cancel')
                  }
                })
              }}
            />

            <AnimatePresence>
              {validationResult && (
                <Panel position="top-center">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={cn(
                      'px-4 py-2 rounded-lg shadow-lg flex items-center gap-2',
                      validationResult.valid
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    )}
                  >
                    {validationResult.valid ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{validationResult.message}</span>
                  </motion.div>
                </Panel>
              )}
            </AnimatePresence>
          </ReactFlow>
        </div>

        <AnimatePresence>
          {showConfigPanel && (
            <WorkflowConfigPanel
              node={selectedNode}
              onClose={() => {
                setShowConfigPanel(false)
                setSelectedNode(null)
              }}
              onSave={handleConfigSave}
              onDelete={handleDeleteNode}
              validationErrors={validationErrors}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTestPanel && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-80 bg-background border-l border-border flex flex-col h-full"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">测试运行</h3>
                </div>
                <button
                  onClick={() => setShowTestPanel(false)}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground/70" />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                {searchParams.get('id') ? (
                  <TestRunPanel
                    workflowId={searchParams.get('id')!}
                    nodes={nodes}
                    onNodeClick={(nodeId) => {
                      setSelectedTestNode(nodeId)
                      setShowNodeOutputPanel(true)
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    请先保存工作流以运行测试
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNodeOutputPanel && selectedTestNode && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-14 bottom-0 w-80 z-50"
            >
              <NodeOutputPanel
                nodeId={selectedTestNode}
                nodeName={nodes.find((n) => n.id === selectedTestNode)?.data?.label as string || selectedTestNode}
                output={testNodeResults.get(selectedTestNode)?.output}
                error={testNodeResults.get(selectedTestNode)?.error}
                duration={testNodeResults.get(selectedTestNode)?.duration}
                onClose={() => {
                  setShowNodeOutputPanel(false)
                  setSelectedTestNode(null)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SaveWorkflowModal
        isOpen={showSaveModal}
        onSave={handleSaveWorkflow}
        onClose={() => setShowSaveModal(false)}
      />

      <WorkflowSelectorModal
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleSelectTemplate}
        mode="template"
        title="Start from Template"
      />

      <WorkflowSelectorModal
        isOpen={showWorkflowSelector}
        onClose={() => setShowWorkflowSelector(false)}
        onSelect={handleSelectWorkflow}
        mode="workflow"
        title="Load Workflow"
      />

        <AnimatePresence>
          {showVersionPanel && (
            <WorkflowVersionPanel
              versions={versions}
              activeVersion={activeVersion}
              isLoading={isLoadingVersions}
              onClose={() => setShowVersionPanel(false)}
              onVersionChange={handleVersionChange}
              onActivateVersion={handleActivateVersion}
            />
          )}
        </AnimatePresence>

      <Dialog
        open={showSaveVersionModal}
        onClose={() => setShowSaveVersionModal(false)}
        title="Save New Version"
        size="sm"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Version Name (optional)</Label>
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g., Bug fix for authentication"
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Change Summary</Label>
            <Textarea
              value={versionChangeSummary}
              onChange={(e) => setVersionChangeSummary(e.target.value)}
              placeholder="Describe what changed in this version..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => setShowSaveVersionModal(false)}
            className="px-4 py-2 rounded-md bg-secondary text-foreground/80 text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateVersion}
            disabled={isSavingVersion}
            className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSavingVersion && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Version
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// Wrapper with ReactFlowProvider
export default function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  )
}
