import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Clock, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from './BaseNodeWrapper'

export interface TriggerNodeData extends Record<string, unknown> {
  cronExpression: string
  isActive: boolean
  timezone?: string
  label?: string
}

export type TriggerNodeType = Node<TriggerNodeData, 'trigger'>

export function TriggerNode({ data, selected }: { data: TriggerNodeData; selected?: boolean }) {
  const { cronExpression, isActive, timezone, label } = data

  return (
    <>
      <BaseNodeWrapper
        isSelected={selected}
        borderColor={isActive ? 'border-green-500/60' : 'border-dark-600'}
        header={
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isActive ? 'bg-green-500' : 'bg-dark-500'
              )}
            />
            <span className="text-xs font-medium text-dark-300">Trigger</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              isActive ? 'bg-green-500/10' : 'bg-dark-800'
            )}
          >
            <Clock
              className={cn(
                'w-5 h-5',
                isActive ? 'text-green-400' : 'text-dark-400'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label || 'Cron Schedule'}
            </p>
            <p className="text-xs text-primary font-mono mt-1 truncate">
              {cronExpression || '* * * * *'}
            </p>
            {timezone && (
              <div className="flex items-center gap-1 mt-1.5">
                <Globe className="w-3 h-3 text-dark-400" />
                <span className="text-xs text-dark-400 truncate">{timezone}</span>
              </div>
            )}
          </div>
        </div>

        {isActive && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/50"
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
}
