import * as React from 'react'
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
  Zap,
  GitBranch,
  Repeat,
  MessageSquare,
  Layers,
  Save,
  Upload,
  Download,
  CheckCircle,
  Trash2,
  X,
  Settings,
  AlertCircle,
  Wrench,
  Server,
  Loader2,
} from 'lucide-react'

import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'
import { ActionConfigPanel } from '@/components/workflow/config-panels/ActionConfigPanel'
import { SaveWorkflowModal } from '@/components/workflow/SaveWorkflowModal'
import { useWorkflowStore, isValidWorkflow, hasActionNode } from '@/stores/workflow'
import type { WorkflowNode, WorkflowEdge, GroupedActionNodes } from '@/types/cron'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'

// Node Types Registry
const nodeTypes: NodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
}

// Node Palette Configuration
interface NodePaletteItem {
  type: string
  label: string
  icon: React.ElementType
  category: 'logic' | 'action'
  description: string
}

interface AvailableActionItem {
  service: string
  method: string
  label: string
}

const logicNodes: NodePaletteItem[] = [
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    category: 'logic',
    description: 'Conditional branching logic',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: Repeat,
    category: 'logic',
    description: 'Iterate over data',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: Zap,
    category: 'logic',
    description: 'Data transformation',
  },
]

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
    default:
      return { label: type }
  }
}

// Convert store node to React Flow node
const storeNodeToRFNode = (node: WorkflowNode): Node => ({
  id: node.id,
  type: node.type,
  position: node.position,
  data: node.data.config || {},
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

// Toolbar Component
function Toolbar({
  onSave,
  onSaveToServer,
  onLoad,
  onLoadFromServer,
  onValidate,
  onClear,
  isValid,
  nodeCount,
  edgeCount,
  isSaving,
}: {
  onSave: () => void
  onSaveToServer: () => void
  onLoad: () => void
  onLoadFromServer: () => void
  onValidate: () => void
  onClear: () => void
  isValid: boolean
  nodeCount: number
  edgeCount: number
  isSaving: boolean
}) {
  return (
    <div className="h-14 bg-muted/30 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          Workflow Builder
        </h2>
        <span className="text-xs text-muted-foreground/70">
          {nodeCount} nodes, {edgeCount} edges
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onValidate}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isValid
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          )}
        >
          <CheckCircle className="w-4 h-4" />
          Validate
        </button>

        <button
          onClick={onSaveToServer}
          disabled={isSaving || !isValid}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isValid
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
          Save to Server
        </button>

        <button
          onClick={onLoadFromServer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          <Download className="w-4 h-4" />
          Load from Server
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <Save className="w-4 h-4" />
          Export
        </button>

        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-secondary text-foreground/80 hover:bg-secondary/80 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  )
}

// Node Palette Sidebar
function NodePalette({ onDragStart }: { onDragStart: (event: React.DragEvent, nodeType: string, actionData?: AvailableActionItem) => void }) {
  const [availableActions, setAvailableActions] = React.useState<GroupedActionNodes>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    apiClient.get<{ success: boolean; data: GroupedActionNodes }>('/workflows/available-actions')
      .then(data => {
        if (data.success && data.data) {
          setAvailableActions(data.data)
        } else {
          setError('Failed to load actions')
        }
      })
      .catch(err => {
        console.error('Failed to load available actions:', err)
        setError('Failed to load actions')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const categoryIcons: Record<string, React.ElementType> = {
    'MiniMax API': MessageSquare,
    'Database': Layers,
    'Logic': GitBranch,
    'default': Wrench,
  }

  return (
    <div className="w-64 bg-muted/30 border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">节点面板</h3>
        <p className="text-xs text-muted-foreground/70 mt-1">拖拽节点到画布</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* Logic Nodes */}
        <div className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wider mb-2 text-purple-400">
            逻辑节点
          </h4>
          <div className="space-y-1">
            {logicNodes.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type)}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-grab hover:bg-muted/50 transition-colors group"
                >
                  <div className="p-2 rounded-md bg-muted/50 group-hover:bg-muted">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground/50 truncate">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Nodes */}
        <div className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wider mb-2 text-blue-400">
            动作节点
          </h4>
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-xs text-destructive/70 p-3">
              {error}
            </div>
          ) : Object.keys(availableActions).length === 0 ? (
            <div className="text-xs text-muted-foreground/50 p-3">
              暂无可用动作
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(availableActions).map(([category, actions]) => {
                const Icon = categoryIcons[category] || categoryIcons.default
                return (
                  <div key={category}>
                    <h5 className="text-xs font-medium text-muted-foreground/70 mb-2 px-1">{category}</h5>
                    <div className="space-y-1">
                      {actions.map((action) => (
                        <div
                          key={`${action.service}.${action.method}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, 'action', {
                            service: action.service,
                            method: action.method,
                            label: action.label,
                          })}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-grab hover:bg-muted/50 transition-colors group"
                        >
                          <div className="p-2 rounded-md bg-muted/50 group-hover:bg-muted">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{action.label}</p>
                            <p className="text-xs text-muted-foreground/50 truncate">{action.service}.{action.method}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Configuration Panel
function ConfigPanel({
  node,
  onClose,
  onSave,
  onDelete,
}: {
  node: Node | null
  onClose: () => void
  onSave: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}) {
  const [config, setConfig] = React.useState<Record<string, unknown>>({})

  React.useEffect(() => {
    if (node) {
      setConfig(node.data as Record<string, unknown>)
    }
  }, [node])

  if (!node) return null

  const handleSave = () => {
    onSave(node.id, config)
    onClose()
  }

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const nodeType = node.type as string
  const Icon = logicNodes.find((n) => n.type === nodeType)?.icon || Settings

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-80 bg-background border-l border-border flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-dark-800">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {(config.label as string) || nodeType}
            </h3>
            <p className="text-xs text-muted-foreground/70 capitalize">{nodeType} Configuration</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground/70" />
        </button>
      </div>

      {/* Config Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label Field - Common to all */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Label</label>
          <input
            type="text"
            value={(config.label as string) || ''}
            onChange={(e) => updateConfig('label', e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Node label"
          />
        </div>

        {nodeType === 'action' && (
          <ActionConfigPanel
            config={(config.config as { service: string; method: string; args?: unknown[] }) || { service: '', method: '' }}
            onChange={(newConfig) => updateConfig('config', newConfig)}
          />
        )}

        {nodeType === 'condition' && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Condition Type</label>
              <select
                value={(config.conditionType as string) || 'equals'}
                onChange={(e) => updateConfig('conditionType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Service Type</label>
              <select
                value={(config.serviceType as string) || 'text'}
                onChange={(e) => updateConfig('serviceType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="text">Text</option>
                <option value="voice_sync">Voice Sync</option>
                <option value="voice_async">Voice Async</option>
                <option value="image">Image</option>
                <option value="music">Music</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Threshold</label>
              <input
                type="number"
                value={(config.threshold as number) || 0}
                onChange={(e) => updateConfig('threshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </>
        )}

        {nodeType === 'loop' && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Condition</label>
              <input
                type="text"
                value={(config.condition as string) || ''}
                onChange={(e) => updateConfig('condition', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="While condition is true"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max Iterations</label>
              <input
                type="number"
                min="1"
                value={(config.maxIterations as number) || 100}
                onChange={(e) => updateConfig('maxIterations', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </>
        )}

        {nodeType === 'transform' && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Transform Type</label>
              <select
                value={(config.transformType as string) || 'map'}
                onChange={(e) => updateConfig('transformType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="map">Map Fields</option>
                <option value="filter">Filter</option>
                <option value="merge">Merge</option>
                <option value="split">Split</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Input Type</label>
              <input
                type="text"
                value={(config.inputType as string) || ''}
                onChange={(e) => updateConfig('inputType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., JSON"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Output Type</label>
              <input
                type="text"
                value={(config.outputType as string) || ''}
                onChange={(e) => updateConfig('outputType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., JSON"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mapping (JSON)</label>
              <textarea
                value={JSON.stringify((config.mapping as Record<string, string>) || {}, null, 2)}
                onChange={(e) => {
                  try {
                    updateConfig('mapping', JSON.parse(e.target.value))
                  } catch {}
                }}
                rows={4}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder='{"key": "value"}'
              />
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-border flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-secondary text-foreground/80 text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => {
            onDelete(node.id)
            onClose()
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </motion.div>
  )
}

// Main Workflow Builder Component
function WorkflowBuilderInner() {
  const { setViewport, screenToFlowPosition } = useReactFlow()
  const store = useWorkflowStore()

  // Local React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [showConfigPanel, setShowConfigPanel] = React.useState(false)
  const [validationResult, setValidationResult] = React.useState<{ valid: boolean; message: string } | null>(null)

  // Initialize from store
  React.useEffect(() => {
    setNodes(store.nodes.map(storeNodeToRFNode))
    setEdges(store.edges as Edge[])
  }, [])

  // Sync nodes to store when they change
  React.useEffect(() => {
    if (nodes.length > 0) {
      const storeNodes = nodes.map(rfNodeToStoreNode)
      storeNodes.forEach((node) => {
        const existing = store.nodes.find((n) => n.id === node.id)
        if (existing) {
          store.updateNode(node.id, node)
        } else {
          store.addNode(node)
        }
      })
    }
  }, [nodes])

  // Sync edges to store
  React.useEffect(() => {
    if (edges.length > 0) {
      edges.forEach((edge) => {
        const existing = store.edges.find((e) => e.id === edge.id)
        if (!existing) {
          store.addEdge({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle || undefined,
            targetHandle: edge.targetHandle || undefined,
          })
        }
      })
    }
  }, [edges])

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
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType,
      position,
      data: getDefaultConfig(nodeType, actionData),
    }

    setNodes((nds) => [...nds, newNode])
    store.addNode(rfNodeToStoreNode(newNode))
  }

  const onConnect = (connection: Connection) => {
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
    }
    setEdges((eds) => addEdge(newEdge, eds))
    store.addEdge({
      id: newEdge.id,
      source: newEdge.source,
      target: newEdge.target,
      sourceHandle: newEdge.sourceHandle ?? undefined,
      targetHandle: newEdge.targetHandle ?? undefined,
    })
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
    store.updateNode(id, { data: { label: data.label as string, config: data } })
  }

  const handleDeleteNode = (id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id))
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id))
    store.deleteNode(id)
    setShowConfigPanel(false)
    setSelectedNode(null)
  }

  const handleSave = () => {
    const json = store.exportToJson()
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
      store.loadFromJson(text)
      setNodes(store.nodes.map(storeNodeToRFNode))
      setEdges(store.edges as Edge[])
    }
    input.click()
  }

  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showSaveModal, setShowSaveModal] = React.useState(false)

  const handleSaveToServer = async () => {
    setShowSaveModal(true)
  }

  const handleSaveWorkflow = async (name: string) => {
    setShowSaveModal(false)
    setIsSaving(true)
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Workflow saved successfully!' })
      } else {
        const data = await response.json()
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save workflow' })
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Network error' })
    }
    setIsSaving(false)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleLoadFromServer = async () => {
    try {
      const response = await fetch('/api/workflows?limit=50')
      if (!response.ok) throw new Error('Failed to fetch workflows')

      const data = await response.json()
      const workflows = data.data?.workflows || []

      if (workflows.length === 0) {
        alert('No saved workflows found.')
        return
      }

      const choice = prompt(
        'Select a workflow to load (enter number):\n' +
        workflows.map((w: { id: string; name: string }, i: number) => `${i + 1}. ${w.name}`).join('\n')
      )

      if (!choice) return

      const index = parseInt(choice, 10) - 1
      if (index < 0 || index >= workflows.length) {
        alert('Invalid selection')
        return
      }

      const selected = workflows[index]
      const nodesData = JSON.parse(selected.nodes_json)
      const edgesData = JSON.parse(selected.edges_json)

      setNodes(nodesData.map(storeNodeToRFNode))
      setEdges(edgesData as Edge[])
      store.reset()
      nodesData.forEach((n: WorkflowNode) => store.addNode(n))
      edgesData.forEach((e: WorkflowEdge) => store.addEdge(e))
    } catch (err) {
      alert('Failed to load workflows')
    }
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
      store.reset()
      setShowConfigPanel(false)
      setSelectedNode(null)
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
    <div className="-m-8 h-[calc(100vh-60px-4rem)] flex flex-col bg-background">
      <Toolbar
        onSave={handleSave}
        onSaveToServer={handleSaveToServer}
        onLoad={handleLoad}
        onLoadFromServer={handleLoadFromServer}
        onValidate={handleValidate}
        onClear={handleClear}
        isValid={workflowIsValid}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        isSaving={isSaving}
      />

      {saveMessage && (
        <div className={cn(
          'absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-sm font-medium',
          saveMessage.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
        )}>
          {saveMessage.text}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onDragStart={onDragStart} />

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
                switch (node.type) {
                  case 'action':
                    return '#3b82f6'
                  case 'loop':
                    return '#a855f7'
                  case 'condition':
                    return '#f59e0b'
                  case 'transform':
                    return '#6366f1'
                  default:
                    return '#71717a'
                }
              }}
              maskColor="rgba(0, 0, 0, 0.8)"
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#374151" />

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
            <ConfigPanel
              node={selectedNode}
              onClose={() => {
                setShowConfigPanel(false)
                setSelectedNode(null)
              }}
              onSave={handleConfigSave}
              onDelete={handleDeleteNode}
            />
          )}
        </AnimatePresence>
      </div>

      <SaveWorkflowModal
        isOpen={showSaveModal}
        onSave={handleSaveWorkflow}
        onClose={() => setShowSaveModal(false)}
      />
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