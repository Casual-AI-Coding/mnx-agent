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
  Clock,
  Zap,
  GitBranch,
  Layers,
  Repeat,
  MessageSquare,
  Mic,
  MicOff,
  Image,
  Music,
  Video,
  Save,
  Upload,
  CheckCircle,
  Trash2,
  X,
  Settings,
  AlertCircle,
  Play,
  FileJson,
  Wrench,
} from 'lucide-react'

import { TriggerNode } from '@/components/cron/nodes/TriggerNode'
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { QueueNode } from '@/components/cron/nodes/QueueNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'
import { TextGenNode } from '@/components/cron/nodes/TextGenNode'
import { VoiceSyncNode } from '@/components/cron/nodes/VoiceSyncNode'
import { VoiceAsyncNode } from '@/components/cron/nodes/VoiceAsyncNode'
import { ImageGenNode } from '@/components/cron/nodes/ImageGenNode'
import { MusicGenNode } from '@/components/cron/nodes/MusicGenNode'
import { VideoGenNode } from '@/components/cron/nodes/VideoGenNode'
import { useWorkflowStore, isValidWorkflow, hasTriggerNode, hasActionNode } from '@/stores/workflow'
import type { WorkflowNode, WorkflowEdge } from '@/types/cron'
import { cn } from '@/lib/utils'

// Node Types Registry
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  loop: LoopNode,
  condition: ConditionNode,
  queue: QueueNode,
  transform: TransformNode,
  'text-generation': TextGenNode,
  'voice-sync': VoiceSyncNode,
  'voice-async': VoiceAsyncNode,
  'image-generation': ImageGenNode,
  'music-generation': MusicGenNode,
  'video-generation': VideoGenNode,
}

// Node Palette Configuration
interface NodePaletteItem {
  type: string
  label: string
  icon: React.ElementType
  category: 'trigger' | 'logic' | 'action'
  description: string
}

const nodePalette: NodePaletteItem[] = [
  // Triggers
  {
    type: 'trigger',
    label: 'Cron Trigger',
    icon: Clock,
    category: 'trigger',
    description: 'Schedule-based workflow trigger',
  },
  // Logic
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    category: 'logic',
    description: 'Conditional branching logic',
  },
  {
    type: 'queue',
    label: 'Queue',
    icon: Layers,
    category: 'logic',
    description: 'Batch processing queue',
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
  // Actions
  {
    type: 'text-generation',
    label: 'Text Generation',
    icon: MessageSquare,
    category: 'action',
    description: 'Generate text with AI',
  },
  {
    type: 'voice-sync',
    label: 'Voice Sync',
    icon: Mic,
    category: 'action',
    description: 'Real-time voice synthesis',
  },
  {
    type: 'voice-async',
    label: 'Voice Async',
    icon: MicOff,
    category: 'action',
    description: 'Batch voice synthesis',
  },
  {
    type: 'image-generation',
    label: 'Image Generation',
    icon: Image,
    category: 'action',
    description: 'Generate images with AI',
  },
  {
    type: 'music-generation',
    label: 'Music Generation',
    icon: Music,
    category: 'action',
    description: 'Generate music with AI',
  },
  {
    type: 'video-generation',
    label: 'Video Generation',
    icon: Video,
    category: 'action',
    description: 'Generate videos with AI',
  },
]

// Default configurations for each node type
const getDefaultConfig = (type: string): Record<string, unknown> => {
  switch (type) {
    case 'trigger':
      return {
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        isActive: true,
        label: 'Cron Trigger',
      }
    case 'text-generation':
      return {
        model: 'kimi-k2.5',
        temperature: 0.7,
        maxTokens: 2048,
        prompt: '',
        label: 'Text Generation',
      }
    case 'voice-sync':
      return {
        model: 'speech-01-turbo',
        voiceId: '',
        speed: 1.0,
        volume: 1.0,
        pitch: 0,
        label: 'Voice Sync',
      }
    case 'voice-async':
      return {
        model: 'speech-01-turbo',
        voiceId: '',
        label: 'Voice Async',
      }
    case 'image-generation':
      return {
        model: 'image-01',
        prompt: '',
        size: '1024x1024',
        count: 1,
        promptOptimizer: true,
        style: 'general',
        label: 'Image Generation',
      }
    case 'music-generation':
      return {
        model: 'music-01',
        prompt: '',
        duration: 30,
        label: 'Music Generation',
      }
    case 'video-generation':
      return {
        model: 'video-01',
        prompt: '',
        duration: 5,
        label: 'Video Generation',
      }
    case 'condition':
      return {
        conditionType: 'equals',
        serviceType: 'text',
        threshold: 0,
        label: 'Condition',
      }
    case 'queue':
      return {
        queueName: 'default',
        batchSize: 10,
        pullStrategy: 'fifo',
        label: 'Queue',
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
  onLoad,
  onValidate,
  onClear,
  isValid,
  nodeCount,
  edgeCount,
}: {
  onSave: () => void
  onLoad: () => void
  onValidate: () => void
  onClear: () => void
  isValid: boolean
  nodeCount: number
  edgeCount: number
}) {
  return (
    <div className="h-14 bg-dark-950 border-b border-dark-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          Workflow Builder
        </h2>
        <span className="text-xs text-dark-400">
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
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>

        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-dark-800 text-dark-200 hover:bg-dark-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Load
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
function NodePalette({ onDragStart }: { onDragStart: (event: React.DragEvent, nodeType: string) => void }) {
  const categories = [
    { key: 'trigger', label: 'Triggers', color: 'text-green-400' },
    { key: 'logic', label: 'Logic', color: 'text-purple-400' },
    { key: 'action', label: 'Actions', color: 'text-blue-400' },
  ] as const

  return (
    <div className="w-64 bg-dark-950 border-r border-dark-800 flex flex-col h-full">
      <div className="p-4 border-b border-dark-800">
        <h3 className="text-sm font-semibold text-foreground">Node Palette</h3>
        <p className="text-xs text-dark-400 mt-1">Drag nodes onto the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {categories.map((category) => (
          <div key={category.key} className="mb-4">
            <h4 className={cn('text-xs font-medium uppercase tracking-wider mb-2', category.color)}>
              {category.label}
            </h4>
            <div className="space-y-1">
              {nodePalette
                .filter((item) => item.category === category.key)
                .map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-grab hover:bg-dark-800 transition-colors group"
                    >
                      <div className="p-2 rounded-md bg-dark-800 group-hover:bg-dark-700">
                        <Icon className="w-4 h-4 text-dark-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                        <p className="text-xs text-dark-500 truncate">{item.description}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
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
  const Icon = nodePalette.find((n) => n.type === nodeType)?.icon || Settings

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-80 bg-dark-900 border-l border-dark-800 flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-dark-800">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {(config.label as string) || nodeType}
            </h3>
            <p className="text-xs text-dark-400 capitalize">{nodeType} Configuration</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-dark-800 transition-colors"
        >
          <X className="w-4 h-4 text-dark-400" />
        </button>
      </div>

      {/* Config Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label Field - Common to all */}
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Label</label>
          <input
            type="text"
            value={(config.label as string) || ''}
            onChange={(e) => updateConfig('label', e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Node label"
          />
        </div>

        {/* Trigger Config */}
        {nodeType === 'trigger' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Cron Expression</label>
              <input
                type="text"
                value={(config.cronExpression as string) || ''}
                onChange={(e) => updateConfig('cronExpression', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground font-mono placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0 0 * * *"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Timezone</label>
              <select
                value={(config.timezone as string) || 'UTC'}
                onChange={(e) => updateConfig('timezone', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Asia/Shanghai">Asia/Shanghai</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-dark-300">Active</label>
              <button
                onClick={() => updateConfig('isActive', !config.isActive)}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  config.isActive ? 'bg-green-500' : 'bg-dark-700'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    config.isActive ? 'translate-x-5' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </>
        )}

        {/* Text Generation Config */}
        {nodeType === 'text-generation' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Model</label>
              <select
                value={(config.model as string) || 'kimi-k2.5'}
                onChange={(e) => updateConfig('model', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="kimi-k2.5">Kimi K2.5</option>
                <option value="kimi-k2">Kimi K2</option>
                <option value="GPT-4">GPT-4</option>
                <option value="Claude-3">Claude-3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Temperature: {(config.temperature as number) || 0.7}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={(config.temperature as number) || 0.7}
                onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Max Tokens</label>
              <input
                type="number"
                value={(config.maxTokens as number) || 2048}
                onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Prompt</label>
              <textarea
                value={(config.prompt as string) || ''}
                onChange={(e) => updateConfig('prompt', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Enter your prompt..."
              />
            </div>
          </>
        )}

        {/* Voice Sync Config */}
        {nodeType === 'voice-sync' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Model</label>
              <select
                value={(config.model as string) || 'speech-01-turbo'}
                onChange={(e) => updateConfig('model', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="speech-01-turbo">Speech-01 Turbo</option>
                <option value="speech-01">Speech-01</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Voice ID</label>
              <input
                type="text"
                value={(config.voiceId as string) || ''}
                onChange={(e) => updateConfig('voiceId', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Enter voice ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Speed: {(config.speed as number) || 1.0}
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={(config.speed as number) || 1.0}
                onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Volume: {(config.volume as number) || 1.0}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={(config.volume as number) || 1.0}
                onChange={(e) => updateConfig('volume', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Pitch: {(config.pitch as number) || 0}
              </label>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={(config.pitch as number) || 0}
                onChange={(e) => updateConfig('pitch', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Voice Async Config */}
        {nodeType === 'voice-async' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Model</label>
              <select
                value={(config.model as string) || 'speech-01-turbo'}
                onChange={(e) => updateConfig('model', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="speech-01-turbo">Speech-01 Turbo</option>
                <option value="speech-01">Speech-01</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Voice ID</label>
              <input
                type="text"
                value={(config.voiceId as string) || ''}
                onChange={(e) => updateConfig('voiceId', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Enter voice ID"
              />
            </div>
          </>
        )}

        {/* Image Generation Config */}
        {nodeType === 'image-generation' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Model</label>
              <select
                value={(config.model as string) || 'image-01'}
                onChange={(e) => updateConfig('model', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="image-01">Image-01</option>
                <option value="image-01-preview">Image-01 Preview</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Prompt</label>
              <textarea
                value={(config.prompt as string) || ''}
                onChange={(e) => updateConfig('prompt', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Describe the image you want to generate..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Size</label>
              <select
                value={(config.size as string) || '1024x1024'}
                onChange={(e) => updateConfig('size', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="1024x1024">1024x1024</option>
                <option value="1024x1792">1024x1792</option>
                <option value="1792x1024">1792x1024</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Count</label>
              <input
                type="number"
                min="1"
                max="4"
                value={(config.count as number) || 1}
                onChange={(e) => updateConfig('count', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Style</label>
              <select
                value={(config.style as string) || 'general'}
                onChange={(e) => updateConfig('style', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="general">General</option>
                <option value="vivid">Vivid</option>
                <option value="natural">Natural</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-dark-300">Prompt Optimizer</label>
              <button
                onClick={() => updateConfig('promptOptimizer', !config.promptOptimizer)}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  config.promptOptimizer ? 'bg-green-500' : 'bg-dark-700'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    config.promptOptimizer ? 'translate-x-5' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </>
        )}

        {/* Music Generation Config */}
        {nodeType === 'music-generation' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Model</label>
              <select
                value={(config.model as string) || 'music-01'}
                onChange={(e) => updateConfig('model', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="music-01">Music-01</option>
                <option value="music-01-preview">Music-01 Preview</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Prompt</label>
              <textarea
                value={(config.prompt as string) || ''}
                onChange={(e) => updateConfig('prompt', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Describe the music you want to generate..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="180"
                value={(config.duration as number) || 30}
                onChange={(e) => updateConfig('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </>
        )}

        {/* Video Generation Config */}
        {nodeType === 'video-generation' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Model</label>
              <select
                value={(config.model as string) || 'video-01'}
                onChange={(e) => updateConfig('model', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="video-01">Video-01</option>
                <option value="video-01-preview">Video-01 Preview</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Prompt</label>
              <textarea
                value={(config.prompt as string) || ''}
                onChange={(e) => updateConfig('prompt', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Describe the video you want to generate..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={(config.duration as number) || 5}
                onChange={(e) => updateConfig('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </>
        )}

        {/* Condition Config */}
        {nodeType === 'condition' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Condition Type</label>
              <select
                value={(config.conditionType as string) || 'equals'}
                onChange={(e) => updateConfig('conditionType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Service Type</label>
              <select
                value={(config.serviceType as string) || 'text'}
                onChange={(e) => updateConfig('serviceType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Threshold</label>
              <input
                type="number"
                value={(config.threshold as number) || 0}
                onChange={(e) => updateConfig('threshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </>
        )}

        {/* Queue Config */}
        {nodeType === 'queue' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Queue Name</label>
              <input
                type="text"
                value={(config.queueName as string) || 'default'}
                onChange={(e) => updateConfig('queueName', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Queue name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Batch Size</label>
              <input
                type="number"
                min="1"
                value={(config.batchSize as number) || 10}
                onChange={(e) => updateConfig('batchSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Pull Strategy</label>
              <select
                value={(config.pullStrategy as string) || 'fifo'}
                onChange={(e) => updateConfig('pullStrategy', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="fifo">FIFO (First In, First Out)</option>
                <option value="lifo">LIFO (Last In, First Out)</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </>
        )}

        {/* Loop Config */}
        {nodeType === 'loop' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Condition</label>
              <input
                type="text"
                value={(config.condition as string) || ''}
                onChange={(e) => updateConfig('condition', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="While condition is true"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Max Iterations</label>
              <input
                type="number"
                min="1"
                value={(config.maxIterations as number) || 100}
                onChange={(e) => updateConfig('maxIterations', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </>
        )}

        {/* Transform Config */}
        {nodeType === 'transform' && (
          <>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Transform Type</label>
              <select
                value={(config.transformType as string) || 'map'}
                onChange={(e) => updateConfig('transformType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="map">Map Fields</option>
                <option value="filter">Filter</option>
                <option value="merge">Merge</option>
                <option value="split">Split</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Input Type</label>
              <input
                type="text"
                value={(config.inputType as string) || ''}
                onChange={(e) => updateConfig('inputType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., JSON"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Output Type</label>
              <input
                type="text"
                value={(config.outputType as string) || ''}
                onChange={(e) => updateConfig('outputType', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., JSON"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Mapping (JSON)</label>
              <textarea
                value={JSON.stringify((config.mapping as Record<string, string>) || {}, null, 2)}
                onChange={(e) => {
                  try {
                    updateConfig('mapping', JSON.parse(e.target.value))
                  } catch {}
                }}
                rows={4}
                className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-sm text-foreground font-mono placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder='{"key": "value"}'
              />
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-dark-800 flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-dark-800 text-dark-200 text-sm font-medium hover:bg-dark-700 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Delete Button */}
      <div className="p-4 border-t border-dark-800">
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
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()

    const nodeType = event.dataTransfer.getData('application/reactflow')
    if (!nodeType) return

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    const newNode: Node = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType,
      position,
      data: getDefaultConfig(nodeType),
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
    const hasTrigger = hasTriggerNode(storeNodes as WorkflowNode[])
    const hasAction = hasActionNode(storeNodes as WorkflowNode[])

    let message = ''
    if (valid) {
      message = 'Workflow is valid!'
    } else if (storeNodes.length === 0) {
      message = 'Workflow is empty. Add some nodes first.'
    } else if (!hasTrigger) {
      message = 'Missing trigger node. Add a trigger to start the workflow.'
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
    <div className="flex flex-col h-full w-full bg-dark-900">
      <Toolbar
        onSave={handleSave}
        onLoad={handleLoad}
        onValidate={handleValidate}
        onClear={handleClear}
        isValid={workflowIsValid}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />

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
            className="bg-dark-900"
          >
            <Controls className="bg-dark-800 border border-dark-700 rounded-md" />
            <MiniMap
              className="bg-dark-950 border border-dark-700 rounded-md"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger':
                    return '#22c55e'
                  case 'loop':
                    return '#a855f7'
                  case 'condition':
                    return '#f59e0b'
                  case 'queue':
                    return '#3b82f6'
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