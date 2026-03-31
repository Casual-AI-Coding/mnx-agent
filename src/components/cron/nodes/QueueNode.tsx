import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { List, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface QueueNodeData extends Record<string, unknown> {
  queueName: string
  batchSize?: number
  pullStrategy?: 'fifo' | 'lifo' | 'priority'
  itemCount?: number
  label?: string
}

export type QueueNodeType = Node<QueueNodeData, 'queue'>

export function QueueNode({ data, selected }: { data: QueueNodeData; selected?: boolean }) {
  const { queueName, batchSize, pullStrategy, itemCount, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-blue-500/60"
        header={
          <div className="flex items-center gap-2">
            <List className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Queue</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || queueName || 'Task Queue'}
            </p>
            {itemCount !== undefined && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-blue-400 font-mono">{itemCount} items</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-dark-400">
              {batchSize && <span>Batch: {batchSize}</span>}
              {pullStrategy && (
                <span className="uppercase text-dark-300">{pullStrategy}</span>
              )}
            </div>
          </div>
        </div>
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-dark-900"
      />
    </>
  )
}
