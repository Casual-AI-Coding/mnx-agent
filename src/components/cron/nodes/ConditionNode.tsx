import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface ConditionNodeData extends Record<string, unknown> {
  conditionType: string
  serviceType: string
  threshold?: number
  label?: string
}

export type ConditionNodeType = Node<ConditionNodeData, 'condition'>

export function ConditionNode({ data, selected }: { data: ConditionNodeData; selected?: boolean }) {
  const { conditionType, serviceType, threshold, label } = data

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-dark-900"
      />

      <div
        className={cn(
          'relative transform rotate-45',
          'w-40 h-40',
          'flex items-center justify-center'
        )}
      >
        <BaseNodeWrapper
          isSelected={selected}
          borderColor="border-amber-500/60"
          className="transform -rotate-45 w-36"
          header={
            <div className="flex items-center gap-2">
              <GitBranch className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">IF</span>
            </div>
          }
        >
          <div className="text-center">
            <p className="text-sm font-medium text-foreground truncate">
              {label || 'Condition'}
            </p>
            <p className="text-xs text-amber-400 mt-1">
              {conditionType || 'Check'}
            </p>
            <div className="mt-2 text-xs text-dark-400">
              <span className="text-dark-300">{serviceType}</span>
              {threshold !== undefined && (
                <span className="ml-1">&gt; {threshold}</span>
              )}
            </div>
          </div>
        </BaseNodeWrapper>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-dark-900"
        style={{ right: -6 }}
      >
        <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs text-green-400">True</span>
      </Handle>

      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-dark-900"
        style={{ bottom: -6 }}
      >
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-xs text-red-400">False</span>
      </Handle>
    </>
  )
}
