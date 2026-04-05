import * as React from 'react'
import { motion } from 'framer-motion'
import { X, AlertCircle, Trash2 } from 'lucide-react'
import { ActionConfigPanel } from '@/components/workflow/config-panels/ActionConfigPanel'
import type { Node } from '@xyflow/react'
import type { ValidationError } from '@/lib/workflow-validation'
import { getErrorHelp } from '@/lib/workflow-error-messages'
import { cn } from '@/lib/utils'
import { logicNodes } from './WorkflowNodePalette'

interface WorkflowConfigPanelProps {
  node: Node | null
  onClose: () => void
  onSave: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  validationErrors?: ValidationError[]
}

export function WorkflowConfigPanel({
  node,
  onClose,
  onSave,
  onDelete,
  validationErrors = [],
}: WorkflowConfigPanelProps) {
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
  const Icon = logicNodes.find((n) => n.type === nodeType)?.icon || (() => null)

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

        {nodeType === 'errorBoundary' && (
          <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/30">
            <p className="text-xs text-teal-400">
              Error Boundary wraps downstream nodes to catch errors.
              Connect nodes to the &quot;Success&quot; handle for normal flow,
              and to the &quot;Error&quot; handle for error recovery.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              On error, the error context will be available via:
            </p>
            <code className="text-xs text-teal-300 font-mono block mt-1">
              {'{{'}nodeId.error.message{'}}'}
            </code>
          </div>
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
