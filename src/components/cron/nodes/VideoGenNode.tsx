import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface VideoGenNodeData extends Record<string, unknown> {
  model?: string
  prompt?: string
  duration?: number
  label?: string
}

export type VideoGenNodeType = Node<VideoGenNodeData, 'videoGen'>

export function VideoGenNode({ data, selected }: { data: VideoGenNodeData; selected?: boolean }) {
  const { model, prompt, duration, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-red-500/60"
        header={
          <div className="flex items-center gap-2">
            <Video className="w-3 h-3 text-red-400" />
            <span className="text-xs font-medium text-red-400">Video Gen</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <Video className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || model || 'Video Generation'}
            </p>
            {model && (
              <p className="text-xs text-red-400 mt-1 truncate">
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
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-dark-900"
      />
    </>
  )
}