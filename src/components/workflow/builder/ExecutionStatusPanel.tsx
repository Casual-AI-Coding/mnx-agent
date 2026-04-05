import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react'
import { Panel } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'

interface ExecutionStatusPanelProps {
  executionId: string | null
  status: 'idle' | 'running' | 'completed' | 'paused'
  nodeStatuses: Map<string, { status: string }>
  startTime: Date | null
  isSubscribed: boolean
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

export function ExecutionStatusPanel({
  executionId,
  status,
  nodeStatuses,
  startTime,
  isSubscribed,
  onPause,
  onResume,
  onCancel,
}: ExecutionStatusPanelProps) {
  if (!executionId && status === 'idle') return null

  const totalNodes = nodeStatuses.size
  const completedNodes = Array.from(nodeStatuses.values()).filter(
    (s) => s.status === 'completed'
  ).length
  const runningNodes = Array.from(nodeStatuses.values()).filter(
    (s) => s.status === 'running'
  ).length
  const errorNodes = Array.from(nodeStatuses.values()).filter(
    (s) => s.status === 'error'
  ).length

  const elapsed = startTime ? Date.now() - startTime.getTime() : 0
  const elapsedSeconds = Math.floor(elapsed / 1000)
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  const elapsedFormatted = `${elapsedMinutes}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`

  const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  const statusConfig = {
    idle: { color: statusTokens.pending.bg, text: 'Idle', icon: Clock },
    running: { color: statusTokens.info.bg, text: 'Running', icon: Play },
    completed: { color: statusTokens.success.bg, text: 'Completed', icon: CheckCircle },
    paused: { color: statusTokens.warning.bg, text: 'Paused', icon: Pause },
  }

  const StatusIcon = statusConfig[status].icon

  return (
    <Panel position="bottom-left" className="m-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 min-w-[280px]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Execution Status</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', statusConfig[status].color, status === 'running' && 'animate-pulse')} />
            <span className="text-xs font-medium text-muted-foreground">{statusConfig[status].text}</span>
          </div>
        </div>

        {executionId && (
          <div className="mb-3">
            <span className="text-xs text-muted-foreground">ID:</span>
            <code className="text-xs font-mono text-foreground ml-2">{executionId.slice(0, 8)}...</code>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{completedNodes}/{totalNodes} ({progress}%)</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', statusConfig[status].color)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Loader2 className={cn('w-3 h-3', statusTokens.info.icon)} />
              <span className="text-sm font-semibold text-foreground">{runningNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Running</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className={cn('w-3 h-3', statusTokens.success.icon)} />
              <span className="text-sm font-semibold text-foreground">{completedNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Completed</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3 text-destructive" />
              <span className="text-sm font-semibold text-foreground">{errorNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Errors</span>
          </div>
        </div>

        {startTime && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Elapsed Time</span>
            <span className="font-mono text-foreground">{elapsedFormatted}</span>
          </div>
        )}

        {!isSubscribed && (
          <div className={cn('mt-3 flex items-center gap-1.5 text-xs', statusTokens.warning.text)}>
            <AlertCircle className="w-3 h-3" />
            <span>Not connected to updates</span>
          </div>
        )}

        {(status === 'running' || status === 'paused') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            {status === 'running' && (
              <button
                onClick={onPause}
                className={cn('flex items-center gap-1 px-2 py-1 text-xs font-medium rounded', statusTokens.warning.bgSubtle, statusTokens.warning.text, 'hover:bg-warning/30')}
              >
                <Pause className="w-3 h-3" />
                Pause
              </button>
            )}
            {status === 'paused' && (
              <button
                onClick={onResume}
                className={cn('flex items-center gap-1 px-2 py-1 text-xs font-medium rounded', statusTokens.success.bgSubtle, statusTokens.success.text, 'hover:bg-success/30')}
              >
                <Play className="w-3 h-3" />
                Resume
              </button>
            )}
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-destructive/20 text-destructive hover:bg-destructive/30"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </Panel>
  )
}
