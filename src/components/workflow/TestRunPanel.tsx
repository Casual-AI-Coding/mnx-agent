import * as React from 'react'
import { Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'
import { useWorkflowUpdates } from '@/hooks/useWorkflowUpdates'
import { cancelExecution } from '@/lib/api/cron'
import { ExecutionSummary } from './ExecutionSummary'
import { NodeResultItem } from './NodeResultItem'
import { TestRunControls } from './TestRunControls'
import type { TestRunNodeResult } from './types'

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

  const { nodeStatuses, isSubscribed } = useWorkflowUpdates({
    executionId: executionId ?? undefined,
    workflowId: workflowId ?? undefined,
    enabled: !!executionId || !!workflowId,
  })

  React.useEffect(() => {
    if (!isRunning || !startTime) return
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime.getTime())
    }, 100)
    return () => clearInterval(interval)
  }, [isRunning, startTime])

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

  const mergedNodeResults = React.useMemo(() => {
    const merged = new Map<string, TestRunNodeResult>()
    result?.nodes.forEach((n) => merged.set(n.id, n))

    nodeStatuses.forEach((status, nodeId) => {
      const existing = merged.get(nodeId)
      merged.set(nodeId, {
        id: nodeId,
        status: (status.status === 'error' ? 'failed' : status.status === 'idle' ? 'pending' : status.status) as TestRunNodeResult['status'],
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
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  const expandAllErrors = () => {
    const errorNodeIds = new Set<string>()
    mergedNodeResults.forEach((r, nodeId) => {
      if (r.status === 'failed' || r.error) errorNodeIds.add(nodeId)
    })
    setExpandedNodes(errorNodeIds)
  }

  React.useEffect(() => {
    if (result?.status === 'failed' || result?.status === 'cancelled') {
      expandAllErrors()
    }
  }, [result?.status])

  const hasErrors = React.useMemo(
    () => Array.from(mergedNodeResults.values()).some((r) => r.status === 'failed' || r.error),
    [mergedNodeResults]
  )

  return (
    <div className={cn('space-y-4', className)}>
      <TestRunControls
        isRunning={isRunning}
        isDryRun={isDryRun}
        isSubscribed={isSubscribed}
        showConfig={showConfig}
        onRun={() => handleRun(false)}
        onDryRun={() => handleRun(true)}
        onCancel={handleCancel}
        onToggleConfig={() => setShowConfig(!showConfig)}
      />

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

      {(isRunning || result || nodeStatuses.size > 0) && (
        <ExecutionSummary
          result={result}
          nodeStatuses={nodeStatuses}
          executionId={executionId}
          elapsedTime={elapsedTime}
        />
      )}

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
