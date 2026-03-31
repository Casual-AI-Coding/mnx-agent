import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface VoiceAsyncNodeData extends Record<string, unknown> {
  model?: string
  voiceId?: string
  text?: string
  fileId?: string
  label?: string
}

export type VoiceAsyncNodeType = Node<VoiceAsyncNodeData, 'voiceAsync'>

export function VoiceAsyncNode({ data, selected }: { data: VoiceAsyncNodeData; selected?: boolean }) {
  const { model, voiceId, text, fileId, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-orange-500/60"
        header={
          <div className="flex items-center gap-2">
            <MicOff className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-medium text-orange-400">Voice Async</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <MicOff className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || voiceId || 'Voice Synthesis (Async)'}
            </p>
            {voiceId && (
              <p className="text-xs text-orange-400 mt-1 truncate">
                Voice: {voiceId}
              </p>
            )}
            {model && (
              <p className="text-xs text-dark-400 mt-0.5 truncate">
                Model: {model}
              </p>
            )}
            {(text || fileId) && (
              <p className="text-xs text-dark-500 mt-1.5 truncate">
                {fileId ? `File: ${fileId}` : text?.slice(0, 40)}
                {(text && text.length > 40) || (fileId && fileId.length > 40) ? '...' : ''}
              </p>
            )}
          </div>
        </div>
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-dark-900"
      />
    </>
  )
}