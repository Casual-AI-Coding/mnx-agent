import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface MusicGenNodeData extends Record<string, unknown> {
  model?: string
  prompt?: string
  duration?: number
  label?: string
}

export type MusicGenNodeType = Node<MusicGenNodeData, 'musicGen'>

export function MusicGenNode({ data, selected }: { data: MusicGenNodeData; selected?: boolean }) {
  const { model, prompt, duration, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-violet-500/60"
        header={
          <div className="flex items-center gap-2">
            <Music className="w-3 h-3 text-violet-400" />
            <span className="text-xs font-medium text-violet-400">Music Gen</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Music className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || model || 'Music Generation'}
            </p>
            {model && (
              <p className="text-xs text-violet-400 mt-1 truncate">
                {model}
              </p>
            )}
            {duration !== undefined && (
              <p className="text-xs text-dark-400 mt-1">
                Duration: <span className="font-mono">{duration}s</span>
              </p>
            )}
            {prompt && (
              <p className="text-xs text-dark-500 mt-1.5 truncate">
                {prompt.slice(0, 50)}{prompt.length > 50 ? '...' : ''}
              </p>
            )}
          </div>
        </div>
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-dark-900"
      />
    </>
  )
}