import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface TextGenNodeData extends Record<string, unknown> {
  model?: string
  temperature?: number
  maxTokens?: number
  prompt?: string
  label?: string
}

export type TextGenNodeType = Node<TextGenNodeData, 'textGen'>

export function TextGenNode({ data, selected }: { data: TextGenNodeData; selected?: boolean }) {
  const { model, temperature, maxTokens, prompt, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-primary !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-primary/60"
        header={
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">Text Gen</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || model || 'Text Generation'}
            </p>
            {model && (
              <p className="text-xs text-primary/80 mt-1 truncate">
                {model}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-dark-400">
              {temperature !== undefined && (
                <span className="font-mono">T: {temperature}</span>
              )}
              {maxTokens !== undefined && (
                <span className="font-mono">Max: {maxTokens}</span>
              )}
            </div>
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
        className="!w-3 !h-3 !bg-primary !border-2 !border-dark-900"
      />
    </>
  )
}