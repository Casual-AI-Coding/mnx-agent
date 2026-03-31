import { type NodeTypes } from '@xyflow/react'

import { BaseNodeWrapper } from './BaseNodeWrapper'
import { TriggerNode, type TriggerNodeData, type TriggerNodeType } from './TriggerNode'
import { ConditionNode, type ConditionNodeData, type ConditionNodeType } from './ConditionNode'
import { QueueNode, type QueueNodeData, type QueueNodeType } from './QueueNode'
import { LoopNode, type LoopNodeData, type LoopNodeType } from './LoopNode'
import { TransformNode, type TransformNodeData, type TransformNodeType } from './TransformNode'
import { TextGenNode, type TextGenNodeData, type TextGenNodeType } from './TextGenNode'
import { VoiceSyncNode, type VoiceSyncNodeData, type VoiceSyncNodeType } from './VoiceSyncNode'
import { VoiceAsyncNode, type VoiceAsyncNodeData, type VoiceAsyncNodeType } from './VoiceAsyncNode'
import { ImageGenNode, type ImageGenNodeData, type ImageGenNodeType } from './ImageGenNode'
import { MusicGenNode, type MusicGenNodeData, type MusicGenNodeType } from './MusicGenNode'
import { VideoGenNode, type VideoGenNodeData, type VideoGenNodeType } from './VideoGenNode'

export const CronNodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  queue: QueueNode,
  loop: LoopNode,
  transform: TransformNode,
  textGen: TextGenNode,
  voiceSync: VoiceSyncNode,
  voiceAsync: VoiceAsyncNode,
  imageGen: ImageGenNode,
  musicGen: MusicGenNode,
  videoGen: VideoGenNode,
} as const satisfies NodeTypes

export type CronNodeType = keyof typeof CronNodeTypes

export type CronNodeDataMap = {
  trigger: TriggerNodeData
  condition: ConditionNodeData
  queue: QueueNodeData
  loop: LoopNodeData
  transform: TransformNodeData
  textGen: TextGenNodeData
  voiceSync: VoiceSyncNodeData
  voiceAsync: VoiceAsyncNodeData
  imageGen: ImageGenNodeData
  musicGen: MusicGenNodeData
  videoGen: VideoGenNodeData
}

export {
  BaseNodeWrapper,
  TriggerNode,
  ConditionNode,
  QueueNode,
  LoopNode,
  TransformNode,
  TextGenNode,
  VoiceSyncNode,
  VoiceAsyncNode,
  ImageGenNode,
  MusicGenNode,
  VideoGenNode,
}

export type {
  TriggerNodeType,
  ConditionNodeType,
  QueueNodeType,
  LoopNodeType,
  TransformNodeType,
  TextGenNodeType,
  VoiceSyncNodeType,
  VoiceAsyncNodeType,
  ImageGenNodeType,
  MusicGenNodeType,
  VideoGenNodeType,
}