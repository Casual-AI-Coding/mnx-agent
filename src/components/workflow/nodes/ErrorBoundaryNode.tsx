import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Shield, ShieldAlert, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from '@/components/cron/nodes/BaseNodeWrapper'

export interface ErrorBoundaryNodeData extends Record<string, unknown> {
  label: string
  hasValidationError?: boolean
  hasValidationWarning?: boolean
}

export type ErrorBoundaryNodeType = Node<ErrorBoundaryNodeData, 'errorBoundary'>

export const ErrorBoundaryNode = React.memo(function ErrorBoundaryNode({ data, selected }: { data: ErrorBoundaryNodeData; selected?: boolean }) {
  const { label, hasValidationError, hasValidationWarning } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-teal-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor={cn(
          'border-teal-500/60',
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
              <Shield className="w-3 h-3 text-teal-400" />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? 'text-destructive' : hasValidationWarning ? 'text-yellow-400' : 'text-teal-400'
            )}>Error Boundary</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? 'bg-destructive/10' : hasValidationWarning ? 'bg-yellow-500/10' : 'bg-teal-500/10'
          )}>
            {hasValidationError ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            ) : (
              <Shield className="w-5 h-5 text-teal-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? 'text-destructive' : hasValidationWarning ? 'text-yellow-400' : 'text-foreground'
            )}>
              {label || 'Error Boundary'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-teal-400'
            )}>
              Try / Catch block
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                Try
              </span>
              <span className="text-xs text-muted-foreground/50">→</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                Catch
              </span>
            </div>
          </div>
        </div>

        {selected && (
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              hasValidationError ? 'bg-destructive/50' : hasValidationWarning ? 'bg-yellow-500/50' : 'bg-teal-500/50'
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </BaseNodeWrapper>

      {/* Success handle - normal flow */}
      <Handle
        type="source"
        position={Position.Right}
        id="success"
        className="!w-3 !h-3 !bg-teal-500 !border-2 !border-dark-900"
        style={{ right: -6 }}
      >
        <span className="absolute -right-10 top-1/2 -translate-y-1/2 text-xs text-teal-400">Success</span>
      </Handle>

      {/* Error handle - error recovery flow */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        className="!w-3 !h-3 !bg-destructive !border-2 !border-dark-900"
        style={{ right: 20, bottom: -6 }}
      >
        <span className="absolute -right-4 -bottom-5 text-xs text-destructive">Error</span>
      </Handle>
    </>
  )
})