import * as React from 'react'
import { Play, RotateCcw, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

interface TestRunNodeResult {
  id: string
  status: 'completed' | 'failed' | 'running' | 'pending'
  output?: unknown
  error?: string
  duration?: number
  input?: unknown
}

interface TestRunResponse {
  success: boolean
  data?: {
    executionId: string
    nodes: TestRunNodeResult[]
    duration: number
    status: 'completed' | 'failed'
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

export function TestRunPanel({ workflowId, nodes, onTestDataChange, onNodeClick, className }: TestRunPanelProps) {
  const [isRunning, setIsRunning] = React.useState(false)
  const [isDryRun, setIsDryRun] = React.useState(false)
  const [result, setResult] = React.useState<{
    status: 'success' | 'failed'
    nodes: TestRunNodeResult[]
    duration: number
    executionId?: string
  } | null>(null)
  const [testData, setTestData] = React.useState<Record<string, unknown>>({})
  const [showConfig, setShowConfig] = React.useState(false)
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())

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

const handleRun = async (dryRun = false) => {
    if (isRunning) return
    
    setIsRunning(true)
    setIsDryRun(dryRun)
    setResult(null)

    try {
      const response = await apiClient.post<TestRunResponse>(`/workflows/${workflowId}/test-run`, {
        testData,
        dryRun,
      })

      if (response.success && response.data) {
        const data = response.data
        setResult({
          status: data.status === 'completed' ? 'success' : 'failed',
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
        } else {
          toast.error(dryRun ? '模拟运行失败' : '测试运行失败', {
            description: '执行过程中出现错误',
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
    }
    
    setIsRunning(false)
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

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin" />
      default:
        return <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/30" />
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
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
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          )}
        >
          {isRunning && !isDryRun ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          运行测试
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
            <RotateCcw className="w-4 h-4" />
          )}
          模拟运行
        </button>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={cn(
            'px-3 py-2 rounded-md border text-sm font-medium transition-colors',
            showConfig
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted/50'
          )}
        >
          {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Test data config */}
      {showConfig && (
        <div className="p-3 bg-muted/50 rounded-md space-y-2">
          <div className="text-xs text-muted-foreground">测试数据配置 (JSON):</div>
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
            className="w-full h-28 px-2 py-1.5 text-xs font-mono bg-background border border-border rounded resize-none"
            placeholder='{"node-1": {"mockResponse": {"text": "示例输出"}}}'
          />
          <p className="text-[10px] text-muted-foreground/70">
            配置模拟节点输出，用于 dry-run 模式或替换实际 API 调用
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border border-border rounded-md overflow-hidden">
          {/* Header */}
          <div
            className={cn(
              'px-3 py-2 flex items-center gap-2 text-sm font-medium',
              result.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive'
            )}
          >
            {result.status === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{result.status === 'success' ? '测试成功' : '测试失败'}</span>
            <span className="text-xs text-muted-foreground ml-auto">{formatDuration(result.duration)}</span>
          </div>

          {/* Node results */}
          <div className="divide-y divide-border max-h-48 overflow-y-auto">
            {result.nodes.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                无节点执行结果
              </div>
            ) : (
              result.nodes.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    'group',
                    onNodeClick && 'cursor-pointer hover:bg-muted/30'
                  )}
                  onClick={() => onNodeClick?.(node.id, node)}
                >
                  <div className="px-3 py-2 flex items-center gap-2">
                    {getStatusIcon(node.status)}
                    <span className="text-xs font-medium flex-1 truncate">
                      {nodes.find((n) => n.id === node.id)?.data?.label || node.id}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatDuration(node.duration)}</span>
                    {node.output !== undefined && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleNodeExpand(node.id)
                        }}
                        className="p-1 hover:bg-secondary rounded transition-colors"
                      >
                        {expandedNodes.has(node.id) ? (
                          <ChevronUp className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded output */}
                  {expandedNodes.has(node.id) && node.output !== undefined && (
                    <div className="px-3 pb-2">
                      <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded overflow-x-auto max-h-32">
                        {JSON.stringify(node.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Error message */}
                  {node.error && (
                    <div className="px-3 pb-2">
                      <div className="text-[10px] text-destructive bg-destructive/10 p-2 rounded">
                        {node.error}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
