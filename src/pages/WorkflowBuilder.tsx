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
  ChevronDown,
  Undo,
  Redo,
  Play,
  Pause,
  Activity,
  Clock,
  XCircle,
  History,
  Tag,
  GitCommit,
  Bug,
} from 'lucide-react'

import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'
import { ActionConfigPanel } from '@/components/workflow/config-panels/ActionConfigPanel'
import { SaveWorkflowModal } from '@/components/workflow/SaveWorkflowModal'
import { WorkflowSelectorModal } from '@/components/workflow/TemplateSelectorModal'
import { TestRunPanel } from '@/components/workflow/TestRunPanel'
import { NodeOutputPanel } from '@/components/workflow/NodeOutputPanel'
import { useWorkflowHistory } from '@/components/workflow/useWorkflowHistory'
import { useWorkflowStore, isValidWorkflow, hasActionNode, serializeWorkflow, deserializeWorkflow } from '@/stores/workflow'
import { useWorkflowUpdates } from '@/hooks/useWorkflowUpdates'
import { NodeStatusIndicator } from '@/components/workflow/NodeStatusIndicator'
import { getWebSocketClient } from '@/lib/websocket-client'
import type { WebSocketEvent, WorkflowTestEventPayload, WorkflowNodeOutputPayload } from '@/lib/websocket-client'
import type { WorkflowNode, WorkflowEdge, GroupedActionNodes } from '@/types/cron'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { validateWorkflow, getNodeErrors, type ValidationError } from '@/lib/workflow-validation'
import { getErrorHelp } from '@/lib/workflow-error-messages'
import {
  getWorkflowVersions,
  getActiveVersion,
  activateVersion,
  createVersion,
  type WorkflowVersion,
} from '@/lib/api/workflows'
import {
  pauseExecution,
  resumeExecution,
  cancelExecution,
} from '@/lib/api/cron'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { toast } from 'sonner'

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

// Toolbar Component
function Toolbar({
  onSave,
  onSaveToServer,
  onLoad,
  onLoadFromServer,
  onValidate,
  onClear,
  onUndo,
  onRedo,
  onSaveVersion,
  onToggleVersionPanel,
  onTestRun,
  canUndo,
  canRedo,
  isValid,
  nodeCount,
  edgeCount,
  isSaving,
  validationSummary,
  currentTemplateId,
  versions,
  activeVersion,
  onVersionChange,
  isLoadingVersions,
  hasWorkflowId,
}: {
  onSave: () => void
  onSaveToServer: () => void
  onLoad: () => void
  onLoadFromServer: () => void
  onValidate: () => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  onSaveVersion: () => void
  onToggleVersionPanel: () => void
  onTestRun?: () => void
  canUndo: boolean
  canRedo: boolean
  isValid: boolean
  nodeCount: number
  edgeCount: number
  isSaving: boolean
  validationSummary?: { total: number; errors: number; warnings: number }
  currentTemplateId?: string
  versions: WorkflowVersion[]
  activeVersion: WorkflowVersion | null
  onVersionChange: (versionId: string) => void
  isLoadingVersions: boolean
  hasWorkflowId: boolean
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
        {validationSummary && validationSummary.total > 0 && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            validationSummary.errors > 0
              ? 'bg-destructive/20 text-destructive'
              : 'bg-yellow-500/20 text-yellow-400'
          )}>
            {validationSummary.errors > 0 && `${validationSummary.errors} error${validationSummary.errors !== 1 ? 's' : ''}`}
            {validationSummary.errors > 0 && validationSummary.warnings > 0 && ', '}
            {validationSummary.warnings > 0 && `${validationSummary.warnings} warning${validationSummary.warnings !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
            canUndo
              ? 'bg-secondary text-foreground/80 hover:bg-secondary/80'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
        >
          <Undo className="w-4 h-4" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
            canRedo
              ? 'bg-secondary text-foreground/80 hover:bg-secondary/80'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
        >
          <Redo className="w-4 h-4" />
          <span className="hidden sm:inline">Redo</span>
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Version Selector - only show when a workflow is loaded */}
        {currentTemplateId && (
          <>
            <Select 
              value={activeVersion?.id || ''} 
              onValueChange={onVersionChange}
            >
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder={isLoadingVersions ? 'Loading...' : 'Select version'} />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2">
                      <span>v{v.version_number}</span>
                      {v.is_active && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded">
                          active
                        </span>
                      )}
                    </div>
                    {v.change_summary && (
                      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {v.change_summary}
                      </div>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={onSaveVersion}
              disabled={!isValid}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
                isValid
                  ? 'bg-secondary text-foreground/80 hover:bg-secondary/80'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Save Version</span>
            </button>

            <button
              onClick={onToggleVersionPanel}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium bg-secondary text-foreground/80 hover:bg-secondary/80 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>

            <div className="w-px h-6 bg-border mx-1" />
          </>
        )}

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
          onClick={onTestRun}
          disabled={!hasWorkflowId}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            hasWorkflowId
              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
          title={hasWorkflowId ? '运行测试' : '请先保存工作流'}
        >
          <Bug className="w-4 h-4" />
          测试运行
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
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
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null)

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

  const toggleCategory = (category: string) => {
    setExpandedCategory(prev => prev === category ? null : category)
  }

  const categoryIcons: Record<string, React.ElementType> = {
    'MiniMax API': MessageSquare,
    'Database': Layers,
    'Logic': GitBranch,
    'default': Wrench,
  }

  return (
    <div className="w-56 bg-muted/30 border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">节点面板</h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5">拖拽节点到画布</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-2 space-y-3">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider mb-2 text-purple-400 px-1">
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
                    className="flex items-center gap-2 p-2 rounded-md cursor-grab hover:bg-muted/50 transition-colors group"
                  >
                    <div className="p-1.5 rounded bg-muted/50 group-hover:bg-muted">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground/50 truncate">{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider mb-2 text-blue-400 px-1">
              动作节点
            </h4>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-xs text-destructive/70 p-2">
                {error}
              </div>
            ) : Object.keys(availableActions).length === 0 ? (
              <div className="text-xs text-muted-foreground/50 p-2">
                暂无可用动作
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(availableActions).map(([category, actions]) => {
                  const Icon = categoryIcons[category] || categoryIcons.default
                  const isExpanded = expandedCategory === category
                  return (
                    <div key={category} className="border border-border/50 rounded-md overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-2 p-2 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="flex-1 text-left text-sm font-medium text-foreground truncate">{category}</span>
                        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground/50 transition-transform', isExpanded && 'rotate-180')} />
                        <span className="text-[10px] text-muted-foreground/50">{actions.length}</span>
                      </button>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="border-t border-border/30 bg-background/50 overflow-hidden"
                        >
                          {actions.map((action) => (
                            <div
                              key={`${action.service}.${action.method}`}
                              draggable
                              onDragStart={(e: React.DragEvent<HTMLDivElement>) => onDragStart(e, 'action', {
                                service: action.service,
                                method: action.method,
                                label: action.label,
                              })}
                              className="flex items-center gap-2 p-2 cursor-grab hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate text-foreground">{action.label}</p>
                                <p className="text-[10px] text-muted-foreground/50 truncate font-mono">{action.service}.{action.method}</p>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
  validationErrors = [],
}: {
  node: Node | null
  onClose: () => void
  onSave: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  validationErrors?: ValidationError[]
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
            <div className="p-2 rounded-md bg-muted">
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

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="px-4 pt-4">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
            <div className="flex items-center gap-2 text-destructive text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>配置问题</span>
            </div>
            {validationErrors.map((error, idx) => {
              const help = getErrorHelp(error.code)
              return (
                <div key={idx} className="text-xs">
                  <div className="text-red-300 font-medium">{help.title}</div>
                  <div className="text-red-400/70 mt-0.5">{help.description}</div>
                  <div className="text-primary-foreground/60 mt-1 flex items-start gap-1.5">
                    <span className="text-[10px] text-primary">💡</span>
                    <span>{help.suggestion}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/30 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </motion.div>
  )
}

// Execution Status Panel Component
function ExecutionStatusPanel({
  executionId,
  status,
  nodeStatuses,
  startTime,
  isSubscribed,
  onPause,
  onResume,
  onCancel,
}: {
  executionId: string | null
  status: 'idle' | 'running' | 'completed' | 'paused'
  nodeStatuses: Map<string, { status: string }>
  startTime: Date | null
  isSubscribed: boolean
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}) {
  if (!executionId && status === 'idle') return null

  const totalNodes = nodeStatuses.size
  const completedNodes = Array.from(nodeStatuses.values()).filter(
    (s) => s.status === 'completed'
  ).length
  const runningNodes = Array.from(nodeStatuses.values()).filter(
    (s) => s.status === 'running'
  ).length
  const errorNodes = Array.from(nodeStatuses.values()).filter(
    (s) => s.status === 'error'
  ).length

  const elapsed = startTime ? Date.now() - startTime.getTime() : 0
  const elapsedSeconds = Math.floor(elapsed / 1000)
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  const elapsedFormatted = `${elapsedMinutes}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`

  const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  const statusConfig = {
    idle: { color: 'bg-gray-500', text: 'Idle', icon: Clock },
    running: { color: 'bg-blue-500', text: 'Running', icon: Play },
    completed: { color: 'bg-green-500', text: 'Completed', icon: CheckCircle },
    paused: { color: 'bg-amber-500', text: 'Paused', icon: Pause },
  }

  const StatusIcon = statusConfig[status].icon

  return (
    <Panel position="bottom-left" className="m-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 min-w-[280px]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Execution Status</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', statusConfig[status].color, status === 'running' && 'animate-pulse')} />
            <span className="text-xs font-medium text-muted-foreground">{statusConfig[status].text}</span>
          </div>
        </div>

        {executionId && (
          <div className="mb-3">
            <span className="text-xs text-muted-foreground">ID:</span>
            <code className="text-xs font-mono text-foreground ml-2">{executionId.slice(0, 8)}...</code>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{completedNodes}/{totalNodes} ({progress}%)</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', statusConfig[status].color)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">{runningNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Running</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-sm font-semibold text-foreground">{completedNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Completed</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3 text-destructive" />
              <span className="text-sm font-semibold text-foreground">{errorNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Errors</span>
          </div>
        </div>

        {startTime && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Elapsed Time</span>
            <span className="font-mono text-foreground">{elapsedFormatted}</span>
          </div>
        )}

        {!isSubscribed && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-500">
            <AlertCircle className="w-3 h-3" />
            <span>Not connected to updates</span>
          </div>
        )}

        {(status === 'running' || status === 'paused') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            {status === 'running' && (
              <button
                onClick={onPause}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              >
                <Pause className="w-3 h-3" />
                Pause
              </button>
            )}
            {status === 'paused' && (
              <button
                onClick={onResume}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                <Play className="w-3 h-3" />
                Resume
              </button>
            )}
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-destructive/20 text-destructive hover:bg-destructive/30"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </Panel>
  )
}

// Main Workflow Builder Component
function WorkflowBuilderInner() {
  const [searchParams] = useSearchParams()
  const { setViewport, screenToFlowPosition } = useReactFlow()
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

  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([])
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
          
          // Only update if validation status changed
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
      // Clear validation status from all nodes
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

    // Check if any nodes are running
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
  
  const trackHistory = React.useCallback(() => {
    setHistory(h => ({ past: [...h.past, { nodes, edges }].slice(-50), future: [] }))
  }, [nodes, edges])

  const generateId = (type: string) => {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 4)
    return `${type}-${timestamp}-${random}`
  }

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
  }, [searchParams])



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
      id: generateId(nodeType),
      type: nodeType,
      position,
      data: getDefaultConfig(nodeType, actionData),
    }

    setNodes((nds) => [...nds, newNode])
    store.setDirty(true)
  }

  const onConnect = (connection: Connection) => {
    const newEdge: Edge = {
      id: generateId('edge'),
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
      <Toolbar
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
            <ConfigPanel
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

      {/* Version History Panel */}
      <AnimatePresence>
        {showVersionPanel && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-14 bottom-0 w-80 bg-background border-l border-border shadow-xl z-40 flex flex-col"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Version History</h3>
              </div>
              <button
                onClick={() => setShowVersionPanel(false)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground/70" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingVersions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No versions yet
                </div>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      activeVersion?.id === version.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-card border-border hover:border-border/80'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <GitCommit className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">v{version.version_number}</span>
                        {version.is_active && (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            active
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {version.change_summary && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {version.change_summary}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleVersionChange(version.id)}
                        className="flex-1 px-2 py-1.5 text-xs font-medium bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                      >
                        Load
                      </button>
                      {!version.is_active && (
                        <button
                          onClick={() => handleActivateVersion(version.id)}
                          className="flex-1 px-2 py-1.5 text-xs font-medium bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Version Dialog */}
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