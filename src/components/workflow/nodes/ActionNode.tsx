import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Wrench, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
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
        className="!w-3 !h-3 !bg-primary !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor={cn(
          'border-blue-500/60',
          hasValidationError && 'border-red-500',
          hasValidationWarning && !hasValidationError && 'border-yellow-500'
        )}
        header={
          <div className="flex items-center gap-2">
            {hasValidationError ? (
              <AlertCircle className="w-3 h-3 text-red-400" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            ) : (
              <Wrench className="w-3 h-3 text-blue-400" />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-muted-foreground'
            )}>Action</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? 'bg-red-500/10' : hasValidationWarning ? 'bg-yellow-500/10' : 'bg-blue-500/10'
          )}>
            {hasValidationError ? (
              <AlertCircle className="w-5 h-5 text-red-400" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            ) : (
              <Wrench className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-foreground'
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
              hasValidationError ? 'bg-red-500/50' : hasValidationWarning ? 'bg-yellow-500/50' : 'bg-blue-500/50'
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
        className="!w-3 !h-3 !bg-primary !border-2 !border-dark-900"
      />
    </>
  )
})
