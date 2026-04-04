import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { ArrowRightLeft, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
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
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor={cn(
          'border-indigo-500/60',
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
              <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-indigo-400'
            )}>Transform</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? 'bg-red-500/10' : hasValidationWarning ? 'bg-yellow-500/10' : 'bg-indigo-500/10'
          )}>
            {hasValidationError ? (
              <AlertCircle className="w-5 h-5 text-red-400" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            ) : (
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-foreground'
            )}>
              {label || 'Transform'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-indigo-400'
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
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-dark-900"
      />
    </>
  )
}
