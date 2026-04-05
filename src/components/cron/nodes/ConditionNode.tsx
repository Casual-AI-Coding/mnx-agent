import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { GitBranch, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { status, primaryText } from '@/themes/tokens'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface ConditionNodeData extends Record<string, unknown> {
  conditionType: string
  serviceType: string
  threshold?: number
  label?: string
  hasValidationError?: boolean
  hasValidationWarning?: boolean
}

export type ConditionNodeType = Node<ConditionNodeData, 'condition'>

export function ConditionNode({ data, selected }: { data: ConditionNodeData; selected?: boolean }) {
  const { conditionType, serviceType, threshold, label, hasValidationError, hasValidationWarning } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-primary !border-2 !border-border"
      />

      <div
        className={cn(
          'relative transform rotate-45',
          'w-40 h-40',
          'flex items-center justify-center'
        )}
      >
        <BaseNodeWrapper
          isSelected={selected}
          borderColor={cn(
            'border-primary/60',
            hasValidationError && status.error.border,
            hasValidationWarning && !hasValidationError && status.warning.border
          )}
          className="transform -rotate-45 w-36"
          header={
            <div className="flex items-center gap-2">
              {hasValidationError ? (
                <AlertCircle className={cn('w-3 h-3', status.error.icon)} />
              ) : hasValidationWarning ? (
                <AlertTriangle className={cn('w-3 h-3', status.warning.icon)} />
              ) : (
                <GitBranch className={cn('w-3 h-3', primaryText[400])} />
              )}
              <span className={cn(
                'text-xs font-medium',
                hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : primaryText[400]
              )}>IF</span>
            </div>
          }
        >
          <div className="text-center">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-foreground'
            )}>
              {label || 'Condition'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : primaryText[400]
            )}>
              {conditionType || 'Check'}
            </p>
            <div className="mt-2 text-xs text-muted-foreground/70">
              <span className="text-muted-foreground">{serviceType}</span>
              {threshold !== undefined && (
                <span className="ml-1">&gt; {threshold}</span>
              )}
            </div>
          </div>
        </BaseNodeWrapper>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-3 !h-3 !bg-success !border-2 !border-border"
        style={{ right: -6 }}
      >
        <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs text-success">True</span>
      </Handle>

      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !bg-destructive !border-2 !border-border"
        style={{ bottom: -6 }}
      >
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-xs text-destructive">False</span>
      </Handle>
    </>
  )
}
