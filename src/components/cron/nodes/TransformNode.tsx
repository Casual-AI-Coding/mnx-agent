import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { ArrowRightLeft, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface TransformNodeData extends Record<string, unknown> {
  transformType: string
  mapping?: Record<string, string>
  inputType?: string
  outputType?: string
  label?: string
  hasValidationError?: boolean
  hasValidationWarning?: boolean
}

export type TransformNodeType = Node<TransformNodeData, 'transform'>

export function TransformNode({ data, selected }: { data: TransformNodeData; selected?: boolean }) {
  const { transformType, mapping, inputType, outputType, label, hasValidationError, hasValidationWarning } = data

  const mappingCount = mapping ? Object.keys(mapping).length : 0

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
              <ArrowRightLeft className={cn('w-3 h-3', status.info.icon)} />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : status.info.text
            )}>Transform</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? status.error.bgLight : hasValidationWarning ? status.warning.bgLight : services.text.bg
          )}>
            {hasValidationError ? (
              <AlertCircle className={cn('w-5 h-5', status.error.icon)} />
            ) : hasValidationWarning ? (
              <AlertTriangle className={cn('w-5 h-5', status.warning.icon)} />
            ) : (
              <ArrowRightLeft className={cn('w-5 h-5', status.info.icon)} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-foreground'
            )}>
              {label || 'Transform'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? status.error.text : hasValidationWarning ? status.warning.text : 'text-muted-foreground'
            )}>
              {transformType || 'Map Fields'}
            </p>
            {(inputType || outputType) && (
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                {inputType && (
                  <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {inputType}
                  </span>
                )}
                <span className="text-muted-foreground/50">→</span>
                {outputType && (
                  <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {outputType}
                  </span>
                )}
              </div>
            )}
            {mappingCount > 0 && (
              <p className="text-xs text-muted-foreground/70 mt-1.5">
                {mappingCount} field{mappingCount > 1 ? 's' : ''} mapped
              </p>
            )}
          </div>
        </div>
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-primary !border-2 !border-border"
      />
    </>
  )
}
