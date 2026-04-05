import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Wrench, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { BaseNodeWrapper } from '@/components/cron/nodes/BaseNodeWrapper'

export interface ActionNodeData extends Record<string, unknown> {
  label: string
  config: {
    service: string
    method: string
    args?: unknown[]
  }
  hasValidationError?: boolean
  hasValidationWarning?: boolean
}

export type ActionNodeType = Node<ActionNodeData, 'action'>

export const ActionNode = React.memo(function ActionNode({ data, selected }: { data: ActionNodeData; selected?: boolean }) {
  const { label, config, hasValidationError, hasValidationWarning } = data
  const { service, method } = config || {}

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-primary !border-2 !border-border"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor={cn(
          'border-primary/60',
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
              <Wrench className="w-3 h-3 text-primary" />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-muted-foreground'
            )}>Action</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? status.error.bgLight : hasValidationWarning ? status.warning.bgLight : 'bg-primary/10'
          )}>
            {hasValidationError ? (
              <AlertCircle className={cn('w-5 h-5', status.error.icon)} />
            ) : hasValidationWarning ? (
              <AlertTriangle className={cn('w-5 h-5', status.warning.icon)} />
            ) : (
              <Wrench className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-foreground'
            )}>
              {label || 'Action'}
            </p>
            {service && (
              <p className="text-xs text-muted-foreground/70 font-mono mt-1 truncate">
                {service}
              </p>
            )}
            {method && (
              <p className="text-xs text-muted-foreground/50 mt-0.5 truncate">
                {method}
              </p>
            )}
          </div>
        </div>

        {selected && (
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              hasValidationError ? status.error.bgSubtle : hasValidationWarning ? status.warning.bgSubtle : 'bg-primary/50'
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
        className="!w-3 !h-3 !bg-primary !border-2 !border-border"
      />
    </>
  )
})
