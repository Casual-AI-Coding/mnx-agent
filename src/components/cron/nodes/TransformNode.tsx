import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface TransformNodeData extends Record<string, unknown> {
  transformType: string
  mapping?: Record<string, string>
  inputType?: string
  outputType?: string
  label?: string
}

export type TransformNodeType = Node<TransformNodeData, 'transform'>

export function TransformNode({ data, selected }: { data: TransformNodeData; selected?: boolean }) {
  const { transformType, mapping, inputType, outputType, label } = data

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
        borderColor="border-indigo-500/60"
        header={
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-400">Transform</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || 'Transform'}
            </p>
            <p className="text-xs text-indigo-400 mt-1">
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
