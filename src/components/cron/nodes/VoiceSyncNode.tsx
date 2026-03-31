import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface VoiceSyncNodeData extends Record<string, unknown> {
  model?: string
  voiceId?: string
  text?: string
  speed?: number
  volume?: number
  pitch?: number
  label?: string
}

export type VoiceSyncNodeType = Node<VoiceSyncNodeData, 'voiceSync'>

export function VoiceSyncNode({ data, selected }: { data: VoiceSyncNodeData; selected?: boolean }) {
  const { model, voiceId, text, speed, volume, pitch, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor="border-rose-500/60"
        header={
          <div className="flex items-center gap-2">
            <Mic className="w-3 h-3 text-rose-400" />
            <span className="text-xs font-medium text-rose-400">Voice Sync</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10">
            <Mic className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || voiceId || 'Voice Synthesis'}
            </p>
            {voiceId && (
              <p className="text-xs text-rose-400 mt-1 truncate">
                Voice: {voiceId}
              </p>
            )}
            {model && (
              <p className="text-xs text-dark-400 mt-0.5 truncate">
                Model: {model}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-dark-500">
              {speed !== undefined && (
                <span className="font-mono">Speed: {speed}</span>
              )}
              {volume !== undefined && (
                <span className="font-mono">Vol: {volume}</span>
              )}
              {pitch !== undefined && (
                <span className="font-mono">Pitch: {pitch}</span>
              )}
            </div>
          </div>
        </div>
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-dark-900"
      />
    </>
  )
}