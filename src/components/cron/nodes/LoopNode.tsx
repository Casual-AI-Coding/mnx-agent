import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Repeat, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { status, secondary, secondaryText } from '@/themes/tokens'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface LoopNodeData extends Record<string, unknown> {
  condition: string
  maxIterations?: number
  currentIteration?: number
  label?: string
  hasValidationError?: boolean
  hasValidationWarning?: boolean
}

export type LoopNodeType = Node<LoopNodeData, 'loop'>

export function LoopNode({ data, selected }: { data: LoopNodeData; selected?: boolean }) {
  const { condition, maxIterations, currentIteration, label, hasValidationError, hasValidationWarning } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-secondary !border-2 !border-border"
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
              <Repeat className={cn('w-3 h-3', secondaryText[400])} />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : secondaryText[400]
            )}>Loop</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? status.error.bgLight : hasValidationWarning ? status.warning.bgLight : secondary[100]
          )}>
            {hasValidationError ? (
              <AlertCircle className={cn('w-5 h-5', status.error.icon)} />
            ) : hasValidationWarning ? (
              <AlertTriangle className={cn('w-5 h-5', status.warning.icon)} />
            ) : (
              <RefreshCw className={cn('w-5 h-5', secondaryText[400])} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-foreground'
            )}>
              {label || 'Loop'}
            </p>
            <p className={cn(
              'text-xs mt-1 truncate',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : secondaryText[400]
            )}>
              {condition || 'While condition'}
            </p>
            {maxIterations !== undefined && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-muted-foreground/70">Max:</span>
                <span className={cn(
                  'text-xs font-mono',
                  hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : secondaryText[400]
                )}>{maxIterations}</span>
                {currentIteration !== undefined && (
                  <span className="text-xs text-muted-foreground/50">
                    ({currentIteration}/{maxIterations})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="continue"
        className="!w-3 !h-3 !bg-secondary !border-2 !border-border"
        style={{ left: '30%' }}
      >
        <span className={cn('absolute left-1/2 -translate-x-1/2 -bottom-5 text-xs', secondaryText[400])}>Continue</span>
      </Handle>

      <Handle
        type="source"
        position={Position.Bottom}
        id="break"
        className="!w-3 !h-3 !bg-destructive !border-2 !border-border"
        style={{ left: '70%' }}
      >
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-xs text-destructive">Break</span>
      </Handle>
    </>
  )
}
