import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Shield, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
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
              <Shield className="w-3 h-3 text-primary" />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-primary'
            )}>Error Boundary</span>
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
              <Shield className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-foreground'
            )}>
              {label || 'Error Boundary'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-primary'
            )}>
              Try / Catch block
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn('text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary')}>Try</span>
              <span className="text-xs text-muted-foreground/50">→</span>
              <span className={cn('text-xs px-1.5 py-0.5 rounded', status.error.bgLight, status.error.text)}>Catch</span>
            </div>
          </div>
        </div>

        {selected && (
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              hasValidationError ? 'bg-destructive/50' : hasValidationWarning ? 'bg-yellow-500/50' : 'bg-primary/50'
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
        className="!w-3 !h-3 !bg-primary !border-2 !border-border"
        style={{ right: -6 }}
      >
        <span className="absolute -right-10 top-1/2 -translate-y-1/2 text-xs text-primary">Success</span>
      </Handle>

      {/* Error handle - error recovery flow */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        className="!w-3 !h-3 !bg-destructive !border-2 !border-border"
        style={{ right: 20, bottom: -6 }}
      >
        <span className="absolute -right-4 -bottom-5 text-xs text-destructive">Error</span>
      </Handle>
    </>
  )
})