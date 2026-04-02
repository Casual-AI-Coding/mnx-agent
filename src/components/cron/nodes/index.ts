import { type NodeTypes } from '@xyflow/react'

import { BaseNodeWrapper } from './BaseNodeWrapper'
import { ConditionNode, type ConditionNodeData, type ConditionNodeType } from './ConditionNode'
import { LoopNode, type LoopNodeData, type LoopNodeType } from './LoopNode'
import { TransformNode, type TransformNodeData, type TransformNodeType } from './TransformNode'

export const CronNodeTypes = {
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
} as const satisfies NodeTypes

export type CronNodeType = keyof typeof CronNodeTypes

export type CronNodeDataMap = {
  condition: ConditionNodeData
  loop: LoopNodeData
  transform: TransformNodeData
}

export {
  BaseNodeWrapper,
  ConditionNode,
  LoopNode,
  TransformNode,
}

export type {
  ConditionNodeType,
  LoopNodeType,
  TransformNodeType,
}
