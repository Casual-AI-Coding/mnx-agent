import * as React from 'react'
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Pause,
  X,
  AlertCircle,
  Clock,
  Activity,
  Terminal,
  Bug,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'
import { useWorkflowUpdates, type WorkflowNodeStatus } from '@/hooks/useWorkflowUpdates'
import { cancelExecution } from '@/lib/api/cron'
import { status, taskStatus } from '@/themes/tokens'

interface TestRunNodeResult {
  id: string
  status: 'completed' | 'failed' | 'running' | 'pending' | 'cancelled'
  output?: unknown
  error?: string
  duration?: number
  input?: unknown
  progress?: number
  startedAt?: string
  completedAt?: string
}

interface TestRunResponse {
  success: boolean
  data?: {
    executionId: string
    nodes: TestRunNodeResult[]
    duration: number
    status: 'completed' | 'failed' | 'cancelled'
  }
  error?: string
}

interface TestRunPanelProps {
  workflowId: string
  nodes: Array<{ id: string; type?: string; data?: { label?: string } }>
  onTestDataChange?: (data: Record<string, unknown>) => void
  onNodeClick?: (nodeId: string, result?: TestRunNodeResult) => void
  className?: string
}

// Error message helper with actionable suggestions
const getErrorHelp = (error: string): { title: string; suggestion: string } => {
  const errorLower = error.toLowerCase()

  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      title: '执行超时',
      suggestion: '节点执行时间超过了限制。尝试优化输入数据或增加超时设置。',
    }
  }
  if (errorLower.includes('rate limit') || errorLower.includes('too many requests')) {
    return {
      title: '请求频率限制',
      suggestion: 'API 请求过于频繁。请等待片刻后重试，或调整工作流节奏。',
    }
  }
  if (errorLower.includes('permission') || errorLower.includes('unauthorized')) {
    return {
      title: '权限不足',
      suggestion: '当前用户没有权限执行此操作。请联系管理员获取相应权限。',
    }
  }
  if (errorLower.includes('not found') || errorLower.includes('404')) {
    return {
      title: '资源未找到',
      suggestion: '引用的资源不存在。检查节点配置中的资源 ID 是否正确。',
    }
  }
  if (errorLower.includes('validation') || errorLower.includes('invalid')) {
    return {
      title: '数据验证失败',
      suggestion: '输入数据格式不正确。检查节点的输入参数是否符合要求。',
    }
  }
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return {
      title: '网络错误',
      suggestion: '网络连接出现问题。请检查网络状态后重试。',
    }
  }
  if (errorLower.includes('cancelled') || errorLower.includes('abort')) {
    return {
      title: '已取消',
      suggestion: '执行被用户手动取消。如需重新运行，请点击运行按钮。',
    }
  }

  return {
    title: '执行错误',
    suggestion: '执行过程中出现错误。请检查节点配置和输入数据，或查看详细错误信息。',
  }
}

// Progress bar component
function ProgressBar({
  progress,
  status,
  animated = false,
}: {
  progress: number
  status: string
  animated?: boolean
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return taskStatus.completed.dot
      case 'failed':
        return taskStatus.failed.dot
      case 'cancelled':
        return taskStatus.cancelled.dot
      case 'running':
        return taskStatus.running.dot
      default:
        return 'bg-primary'
    }
  }

  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full', getStatusColor())}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: animated ? 0.3 : 0, ease: 'easeOut' }}
      />
    </div>
  )
}

// Execution summary component
function ExecutionSummary({
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

// Node result item component
function NodeResultItem({
  node,
  result,
  isExpanded,
  onToggle,
  onClick,
}: {
  node: { id: string; type?: string; data?: { label?: string } }
  result?: TestRunNodeResult
  isExpanded: boolean
  onToggle: () => void
  onClick?: () => void
}) {
  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: taskStatus.completed.text,
          bg: taskStatus.completed.bg,
          border: taskStatus.completed.border,
          label: '成功',
        }
      case 'failed':
        return {
          icon: XCircle,
          color: taskStatus.failed.text,
          bg: taskStatus.failed.bg,
          border: taskStatus.failed.border,
          label: '失败',
        }
      case 'running':
        return {
          icon: Loader2,
          color: taskStatus.running.text,
          bg: taskStatus.running.bg,
          border: taskStatus.running.border,
          label: '运行中',
        }
      case 'cancelled':
        return {
          icon: X,
          color: taskStatus.cancelled.text,
          bg: taskStatus.cancelled.bg,
          border: taskStatus.cancelled.border,
          label: '已取消',
        }
      default:
        return {
          icon: Clock,
          color: 'text-muted-foreground',
          bg: 'bg-muted',
          border: 'border-border',
          label: '待执行',
        }
    }
  }

  const statusConfig = getStatusConfig(result?.status)
  const StatusIcon = statusConfig.icon
  const errorHelp = result?.error ? getErrorHelp(result.error) : null

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <motion.div
      layout
      className={cn(
        'border rounded-lg overflow-hidden transition-colors',
        result?.status === 'running' ? cn(taskStatus.running.border.replace('/20', '/50'), taskStatus.running.bg) : 'border-border',
        result?.status === 'failed' && cn(taskStatus.failed.border.replace('/20', '/50'), taskStatus.failed.bg)
      )}
    >
      <div
        className={cn(
          'px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <div className={cn('p-1.5 rounded', statusConfig.bg)}>
          <StatusIcon className={cn('w-3.5 h-3.5', statusConfig.color, result?.status === 'running' && 'animate-spin')} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{node.data?.label || node.id}</span>
            {result?.status && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-mono">{node.id}</span>
            {result?.duration !== undefined && (
              <>
                <span>·</span>
                <span>{formatDuration(result.duration)}</span>
              </>
            )}
          </div>
        </div>

        {(result?.output !== undefined || result?.error) && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-1.5 hover:bg-secondary rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            {/* Error with suggestion */}
            {result?.error && errorHelp && (
              <div className="p-3 bg-destructive/5 border-b border-destructive/10">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-destructive">{errorHelp.title}</div>
                    <div className="text-xs text-destructive/80 mt-1 font-mono break-all">{result.error}</div>
                    <div className="mt-2 p-2 rounded bg-background/50 border border-destructive/20">
                      <div className="text-xs font-medium text-foreground mb-1">建议:</div>
                      <div className="text-xs text-muted-foreground">{errorHelp.suggestion}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Output */}
            {result?.output !== undefined && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">输出</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(result.output, null, 2))
                      toast.success('已复制到剪贴板')
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    复制
                  </button>
                </div>
                <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded overflow-x-auto max-h-40">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              </div>
            )}

            {/* Input */}
            {result?.input !== undefined && (
              <div className="p-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">输入</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(result.input, null, 2))
                      toast.success('已复制到剪贴板')
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    复制
                  </button>
                </div>
                <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded overflow-x-auto max-h-32">
                  {JSON.stringify(result.input, null, 2)}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function TestRunPanel({
  workflowId,
  nodes,
  onTestDataChange,
  onNodeClick,
  className,
}: TestRunPanelProps) {
  const [isRunning, setIsRunning] = React.useState(false)
  const [isDryRun, setIsDryRun] = React.useState(false)
  const [executionId, setExecutionId] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<{
    status: 'success' | 'failed' | 'cancelled'
    nodes: TestRunNodeResult[]
    duration: number
    executionId?: string
  } | null>(null)
  const [testData, setTestData] = React.useState<Record<string, unknown>>({})
  const [showConfig, setShowConfig] = React.useState(false)
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())
  const [startTime, setStartTime] = React.useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = React.useState(0)

  // Use WebSocket for real-time updates
  const { nodeStatuses, isSubscribed } = useWorkflowUpdates({
    executionId: executionId ?? undefined,
    workflowId: workflowId ?? undefined,
    enabled: !!executionId || !!workflowId,
  })

  // Timer for elapsed time
  React.useEffect(() => {
    if (!isRunning || !startTime) return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime.getTime())
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, startTime])

  // Generate default test data based on nodes
  React.useEffect(() => {
    const defaultData: Record<string, unknown> = {}
    nodes.forEach((node) => {
      if (node.type === 'action') {
        defaultData[node.id] = {
          mockResponse: {
            text: `模拟输出 - ${node.data?.label || node.id}`,
            success: true,
          },
        }
      }
    })
    if (Object.keys(defaultData).length > 0) {
      setTestData(defaultData)
    }
  }, [nodes])

  // Merge WebSocket status updates with results
  const mergedNodeResults = React.useMemo(() => {
    const merged = new Map<string, TestRunNodeResult>()

    // Start with existing results
    result?.nodes.forEach((n) => merged.set(n.id, n))

    // Override with real-time WebSocket updates
    nodeStatuses.forEach((status, nodeId) => {
      const existing = merged.get(nodeId)
      merged.set(nodeId, {
        id: nodeId,
        status: (status.status === 'error' ? 'failed' : status.status === 'idle' ? 'pending' : status.status) as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
        output: status.result ?? existing?.output,
        error: status.errorMessage ?? existing?.error,
        duration: status.completedAt && status.startedAt
          ? new Date(status.completedAt).getTime() - new Date(status.startedAt).getTime()
          : existing?.duration,
        progress: status.progress,
        startedAt: status.startedAt,
        completedAt: status.completedAt,
      })
    })

    return merged
  }, [result, nodeStatuses])

  const handleRun = async (dryRun = false) => {
    if (isRunning) return

    setIsRunning(true)
    setIsDryRun(dryRun)
    setResult(null)
    setExecutionId(null)
    setStartTime(new Date())
    setElapsedTime(0)
    setExpandedNodes(new Set())

    try {
      const response = await apiClient.post<TestRunResponse>(`/workflows/${workflowId}/test-run`, {
        testData,
        dryRun,
      })

      if (response.success && response.data) {
        const data = response.data
        setExecutionId(data.executionId)

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          setResult({
            status: data.status === 'completed' ? 'success' : data.status === 'cancelled' ? 'cancelled' : 'failed',
            nodes: data.nodes.map((n: TestRunNodeResult) => ({
              ...n,
              status: n.status || 'completed',
            })),
            duration: data.duration,
            executionId: data.executionId,
          })

          if (data.status === 'completed') {
            toast.success(dryRun ? '模拟运行成功' : '测试运行成功', {
              description: `耗时 ${data.duration}ms`,
            })
          } else if (data.status === 'cancelled') {
            toast.info('执行已取消')
          } else {
            toast.error(dryRun ? '模拟运行失败' : '测试运行失败', {
              description: '执行过程中出现错误',
            })
          }
        } else {
          // Execution is running, wait for WebSocket updates
          toast.info('执行已开始', {
            description: '可通过下方面板查看实时进度',
          })
        }
      } else {
        throw new Error(response.error || '运行失败')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '测试运行失败'
      setResult({ status: 'failed', nodes: [], duration: 0 })
      toast.error(dryRun ? '模拟运行失败' : '测试运行失败', {
        description: errorMsg,
      })
      setIsRunning(false)
      setStartTime(null)
    }
  }

  const handleCancel = async () => {
    if (!executionId) return

    const response = await cancelExecution(executionId)
    if (response.success) {
      toast.info('正在取消执行...')
      setResult((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              nodes: prev.nodes.map((n) =>
                n.status === 'running' ? { ...n, status: 'cancelled' as const } : n
              ),
            }
          : prev
      )
    } else {
      toast.error(response.error || '取消失败')
    }
  }

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const expandAllErrors = () => {
    const errorNodeIds = new Set<string>()
    mergedNodeResults.forEach((result, nodeId) => {
      if (result.status === 'failed' || result.error) {
        errorNodeIds.add(nodeId)
      }
    })
    setExpandedNodes(errorNodeIds)
  }

  // Auto-expand errors when execution completes
  React.useEffect(() => {
    if (result?.status === 'failed' || result?.status === 'cancelled') {
      expandAllErrors()
    }
  }, [result?.status])

  const hasErrors = React.useMemo(() => {
    return Array.from(mergedNodeResults.values()).some((r) => r.status === 'failed' || r.error)
  }, [mergedNodeResults])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Run buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleRun(false)}
          disabled={isRunning}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md',
            'text-sm font-medium transition-colors',
            isRunning && !isDryRun
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : cn(taskStatus.completed.bg.replace('/10', '/20'), taskStatus.completed.text, 'hover:', taskStatus.completed.bg.replace('/10', '/30'))
          )}
        >
          {isRunning && !isDryRun ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? '执行中...' : '运行测试'}
        </button>
        <button
          onClick={() => handleRun(true)}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isRunning && isDryRun
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-secondary text-foreground/80 hover:bg-secondary/80'
          )}
        >
          {isRunning && isDryRun ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bug className="w-4 h-4" />
          )}
          模拟
        </button>
        {isRunning && (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
            title="取消执行"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={cn(
            'px-3 py-2 rounded-md border text-sm font-medium transition-colors',
            showConfig
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted/50'
          )}
          title="测试数据配置"
        >
          {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Cancel button bar when running */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('flex items-center justify-between p-3 border rounded-lg', taskStatus.running.bg, taskStatus.running.border)}
        >
          <div className="flex items-center gap-2">
            <Loader2 className={cn('w-4 h-4 animate-spin', taskStatus.running.dot)} />
            <span className={cn('text-sm', taskStatus.running.text)}>执行中...</span>
            {isSubscribed ? (
              <span className={cn('text-[10px] flex items-center gap-1', taskStatus.completed.text)}>
                <Activity className={cn('w-3 h-3', taskStatus.completed.dot)} />
                实时更新
              </span>
            ) : (
              <span className={cn('text-[10px] flex items-center gap-1', taskStatus.pending.text)}>
                <AlertCircle className={cn('w-3 h-3', taskStatus.pending.dot)} />
                未连接
              </span>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
          >
            <Pause className="w-3 h-3" />
            取消执行
          </button>
        </motion.div>
      )}

      {/* Test data config */}
      {showConfig && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">测试数据配置 (JSON)</span>
            <span className="text-[10px] text-muted-foreground/70">用于 dry-run 模式</span>
          </div>
          <textarea
            value={JSON.stringify(testData, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                setTestData(parsed)
                onTestDataChange?.(parsed)
              } catch {
                // Allow invalid JSON while typing
              }
            }}
            className="w-full h-28 px-2 py-1.5 text-xs font-mono bg-background border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder='{"node-1": {"mockResponse": {"text": "示例输出"}}}'
          />
          <p className="text-[10px] text-muted-foreground/70">
            配置模拟节点输出，用于 dry-run 模式或替换实际 API 调用
          </p>
        </div>
      )}

      {/* Execution Summary */}
      {(isRunning || result || nodeStatuses.size > 0) && (
        <ExecutionSummary
          result={result}
          nodeStatuses={nodeStatuses}
          executionId={executionId}
          elapsedTime={elapsedTime}
        />
      )}

      {/* Node results */}
      {(result?.nodes.length ?? 0) + nodeStatuses.size > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground">节点执行详情</h4>
            {hasErrors && (
              <button
                onClick={expandAllErrors}
                className="text-[10px] text-destructive hover:underline"
              >
                展开所有错误
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {nodes.map((node) => {
              const nodeResult = mergedNodeResults.get(node.id)
              return (
                <NodeResultItem
                  key={node.id}
                  node={node}
                  result={nodeResult}
                  isExpanded={expandedNodes.has(node.id)}
                  onToggle={() => toggleNodeExpand(node.id)}
                  onClick={() => onNodeClick?.(node.id, nodeResult)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isRunning && !result && nodeStatuses.size === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">点击"运行测试"开始执行</p>
          <p className="text-xs mt-1 opacity-60">测试结果将在这里显示</p>
        </div>
      )}
    </div>
  )
}
