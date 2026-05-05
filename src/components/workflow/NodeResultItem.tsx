import { CheckCircle, XCircle, Loader2, X, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { taskStatus } from '@/themes/tokens'
import type { TestRunNodeResult } from './types'

// Error message helper with actionable suggestions
function getErrorHelp(error: string): { title: string; suggestion: string } {
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

export function NodeResultItem({
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
