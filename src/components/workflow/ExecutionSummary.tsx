import { CheckCircle, XCircle, X, Activity, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { taskStatus } from '@/themes/tokens'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { TestRunNodeResult } from './types'
import type { WorkflowNodeStatus } from '@/hooks/useWorkflowUpdates'

export function ExecutionSummary({
  result,
  nodeStatuses,
  executionId,
  elapsedTime,
}: {
  result: { status: string; duration: number; nodes: TestRunNodeResult[] } | null
  nodeStatuses: Map<string, WorkflowNodeStatus>
  executionId: string | null
  elapsedTime: number
}) {
  if (!result && nodeStatuses.size === 0) return null

  const totalNodes = result?.nodes.length || nodeStatuses.size
  const completedNodes = result
    ? result.nodes.filter((n) => n.status === 'completed').length
    : Array.from(nodeStatuses.values()).filter((s) => s.status === 'completed').length
  const failedNodes = result
    ? result.nodes.filter((n) => n.status === 'failed').length
    : Array.from(nodeStatuses.values()).filter((s) => s.status === 'error').length
  const runningNodes = result
    ? result.nodes.filter((n) => n.status === 'running').length
    : Array.from(nodeStatuses.values()).filter((s) => s.status === 'running').length

  const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusConfig = () => {
    const statusKey = result?.status || (runningNodes > 0 ? 'running' : 'idle')
    switch (statusKey) {
      case 'completed':
        return { icon: CheckCircle, color: taskStatus.completed.text, bg: taskStatus.completed.bg, label: '执行成功' }
      case 'failed':
        return { icon: XCircle, color: taskStatus.failed.text, bg: taskStatus.failed.bg, label: '执行失败' }
      case 'cancelled':
        return { icon: X, color: taskStatus.cancelled.text, bg: taskStatus.cancelled.bg, label: '已取消' }
      case 'running':
        return { icon: Activity, color: taskStatus.running.text, bg: taskStatus.running.bg, label: '执行中' }
      default:
        return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: '准备就绪' }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div className={cn('rounded-lg border overflow-hidden', statusConfig.bg.replace('/10', '/20'))}>
      <div className={cn('px-3 py-2 flex items-center gap-2', statusConfig.bg)}>
        <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
        <span className={cn('text-sm font-medium', statusConfig.color)}>{statusConfig.label}</span>
        {executionId && (
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {executionId.slice(0, 8)}...
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">总体进度</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <ProgressBar progress={progress} status={result?.status || 'running'} animated />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded bg-background/50">
            <div className="flex items-center justify-center gap-1">
              <Activity className={cn('w-3 h-3', taskStatus.running.dot)} />
              <span className="text-sm font-semibold">{runningNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">运行中</span>
          </div>
          <div className="text-center p-2 rounded bg-background/50">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className={cn('w-3 h-3', taskStatus.completed.dot)} />
              <span className="text-sm font-semibold">{completedNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">已完成</span>
          </div>
          <div className="text-center p-2 rounded bg-background/50">
            <div className="flex items-center justify-center gap-1">
              <XCircle className={cn('w-3 h-3', taskStatus.failed.dot)} />
              <span className="text-sm font-semibold">{failedNodes}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">失败</span>
          </div>
          <div className="text-center p-2 rounded bg-background/50">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {formatDuration(result?.duration || elapsedTime)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">耗时</span>
          </div>
        </div>
      </div>
    </div>
  )
}
