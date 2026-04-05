import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Clock, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'
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
        className="!w-3 !h-3 !bg-secondary !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor={cn(
          'border-secondary/60',
          hasValidationError && status.error.border,
          hasValidationWarning && !hasValidationError && status.warning.border
        )}
        header={
          <div className="flex items-center gap-2">
            {hasValidationError ? (
              <AlertCircle className={cn('w-3 h-3', status.error.icon)} />
            ) : hasValidationWarning ? (
              <AlertTriangle className={cn('w-3 h-3', status.warning.icon)} />
            ) : (
              <Clock className={cn('w-3 h-3', services.voice.icon)} />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : services.voice.text
            )}>Delay</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? status.error.bgLight : hasValidationWarning ? status.warning.bgLight : services.voice.bg
          )}>
            {hasValidationError ? (
              <AlertCircle className={cn('w-5 h-5', status.error.icon)} />
            ) : hasValidationWarning ? (
              <AlertTriangle className={cn('w-5 h-5', status.warning.icon)} />
            ) : (
              <Clock className={cn('w-5 h-5', services.voice.icon)} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-foreground'
            )}>
              {label || 'Delay'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : services.voice.text
            )}>
              {displayDuration}
            </p>
          </div>
        </div>

        {selected && (
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              hasValidationError ? status.error.bgSubtle : hasValidationWarning ? status.warning.bgSubtle : services.voice.bg
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
        className="!w-3 !h-3 !bg-secondary !border-2 !border-dark-900"
      />
    </>
  )
})