import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface ImageGenNodeData extends Record<string, unknown> {
  model?: string
  prompt?: string
  size?: string
  count?: number
  prompt_optimizer?: boolean
  style?: string
  label?: string
}

export type ImageGenNodeType = Node<ImageGenNodeData, 'imageGen'>

export function ImageGenNode({ data, selected }: { data: ImageGenNodeData; selected?: boolean }) {
  const { model, prompt, size, count, prompt_optimizer, style, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-emerald-500/60"
        header={
          <div className="flex items-center gap-2">
            <Image className="w-3 h-3 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Image Gen</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Image className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || model || 'Image Generation'}
            </p>
            {model && (
              <p className="text-xs text-emerald-400 mt-1 truncate">
                {model}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-dark-400">
              {size && <span className="font-mono">{size}</span>}
              {count !== undefined && (
                <span className="font-mono">{count} image{count > 1 ? 's' : ''}</span>
              )}
              {style && <span className="text-dark-300">{style}</span>}
            </div>
            {prompt_optimizer && (
              <span className="inline-block mt-1.5 px-1.5 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400">
                Prompt Optimized
              </span>
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
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-dark-900"
      />
    </>
  )
}