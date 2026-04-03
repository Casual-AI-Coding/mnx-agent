import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Repeat, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface LoopNodeData extends Record<string, unknown> {
  condition: string
  maxIterations?: number
  currentIteration?: number
  label?: string
}

export type LoopNodeType = Node<LoopNodeData, 'loop'>

export function LoopNode({ data, selected }: { data: LoopNodeData; selected?: boolean }) {
  const { condition, maxIterations, currentIteration, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-purple-500/60"
        header={
          <div className="flex items-center gap-2">
            <Repeat className="w-3 h-3 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Loop</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <RefreshCw className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || 'Loop'}
            </p>
            <p className="text-xs text-purple-400 mt-1 truncate">
              {condition || 'While condition'}
            </p>
            {maxIterations !== undefined && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-muted-foreground/70">Max:</span>
                <span className="text-xs text-purple-400 font-mono">{maxIterations}</span>
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
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-dark-900"
        style={{ left: '30%' }}
      >
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-xs text-purple-400">Continue</span>
      </Handle>

      <Handle
        type="source"
        position={Position.Bottom}
        id="break"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-dark-900"
        style={{ left: '70%' }}
      >
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-xs text-red-400">Break</span>
      </Handle>
    </>
  )
}
