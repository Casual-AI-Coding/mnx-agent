import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from '@/components/cron/nodes/BaseNodeWrapper'

export interface ActionNodeData extends Record<string, unknown> {
  label: string
  config: {
    service: string
    method: string
    args?: unknown[]
  }
}

export type ActionNodeType = Node<ActionNodeData, 'action'>

export const ActionNode = React.memo(function ActionNode({ data, selected }: { data: ActionNodeData; selected?: boolean }) {
  const { label, config } = data
  const { service, method } = config || {}

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
        borderColor="border-blue-500/60"
        header={
          <div className="flex items-center gap-2">
            <Wrench className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">Action</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Wrench className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || 'Action'}
            </p>
            {service && (
              <p className="text-xs text-muted-foreground/70 font-mono mt-1 truncate">
                {service}
              </p>
            )}
            {method && (
              <p className="text-xs text-muted-foreground/50 mt-0.5 truncate">
                {method}
              </p>
            )}
          </div>
        </div>

        {selected && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/50"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-primary !border-2 !border-dark-900"
      />
    </>
  )
})
