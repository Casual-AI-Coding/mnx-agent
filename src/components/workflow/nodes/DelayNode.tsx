import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Clock, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from '@/components/cron/nodes/BaseNodeWrapper'

export interface DelayNodeData extends Record<string, unknown> {
  label: string
  config: {
    duration?: number
    until?: string
  }
  hasValidationError?: boolean
  hasValidationWarning?: boolean
}

export type DelayNodeType = Node<DelayNodeData, 'delay'>

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.round((ms % 60000) / 1000)
  return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`
}

export const DelayNode = React.memo(function DelayNode({ data, selected }: { data: DelayNodeData; selected?: boolean }) {
  const { label, config, hasValidationError, hasValidationWarning } = data
  const duration = config?.duration
  const until = config?.until

  let displayDuration: string
  if (duration !== undefined) {
    displayDuration = formatDuration(duration)
  } else if (until) {
    const targetTime = new Date(until).getTime()
    const remaining = Math.max(0, targetTime - Date.now())
    displayDuration = `until ${formatDuration(remaining)}`
  } else {
    displayDuration = 'No delay'
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor={cn(
          'border-violet-500/60',
          hasValidationError && 'border-red-500',
          hasValidationWarning && !hasValidationError && 'border-yellow-500'
        )}
        header={
          <div className="flex items-center gap-2">
            {hasValidationError ? (
              <AlertCircle className="w-3 h-3 text-destructive" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            ) : (
              <Clock className="w-3 h-3 text-violet-400" />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? 'text-destructive' : hasValidationWarning ? 'text-yellow-400' : 'text-violet-400'
            )}>Delay</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? 'bg-destructive/10' : hasValidationWarning ? 'bg-yellow-500/10' : 'bg-violet-500/10'
          )}>
            {hasValidationError ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            ) : (
              <Clock className="w-5 h-5 text-violet-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? 'text-destructive' : hasValidationWarning ? 'text-yellow-400' : 'text-foreground'
            )}>
              {label || 'Delay'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-violet-400'
            )}>
              {displayDuration}
            </p>
          </div>
        </div>

        {selected && (
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              hasValidationError ? 'bg-destructive/50' : hasValidationWarning ? 'bg-yellow-500/50' : 'bg-violet-500/50'
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-dark-900"
      />
    </>
  )
})