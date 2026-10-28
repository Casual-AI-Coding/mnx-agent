import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { status as statusTokens } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import type { OperationsRecentFailure, OperationsSection } from '@/lib/api/stats'

export interface RecentFailuresProps {
  failures: OperationsSection<OperationsRecentFailure[]> | null
  loading?: boolean
}

function formatTrigger(trigger: string): string {
  const labels: Record<string, string> = {
    manual: '手动',
    cron: '定时',
    workflow: '工作流',
    webhook: 'Webhook',
  }
  return labels[trigger] ?? trigger
}

function formatTime(startedAt: string): string {
  const date = new Date(startedAt)
  if (Number.isNaN(date.getTime())) return startedAt
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * 最近失败任务（R-005）：展示最近 5 条失败执行，帮助快速定位问题。
 */
export const RecentFailures = memo(function RecentFailures({ failures, loading }: RecentFailuresProps) {
  const degraded = failures != null && 'error' in failures
  const items = failures != null && !('error' in failures) ? failures : []

  return (
    <Card data-testid="recent-failures">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <XCircle className={cn('w-4 h-4', statusTokens.error.icon)} />
            最近失败任务
          </h3>
          <Link to="/cron" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            执行日志 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {failures === null ? (
          <p className="text-sm text-muted-foreground/70 px-4 pb-4">{loading ? '正在加载失败记录...' : '暂无失败记录数据'}</p>
        ) : degraded ? (
          <p className="text-sm text-muted-foreground/70 px-4 pb-4">失败记录暂不可用：{failures.error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 px-4 pb-4">最近没有失败任务，一切正常。</p>
        ) : (
          <div className="divide-y divide-border pb-1">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-secondary/50 transition-colors">
                <span className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', statusTokens.error.bg)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    {item.error_summary || '未知错误'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {formatTrigger(item.trigger_type)} · 失败 {item.tasks_failed} 个任务
                    {item.duration_ms != null ? ` · 耗时 ${(item.duration_ms / 1000).toFixed(1)} 秒` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground/50 whitespace-nowrap tabular-nums">
                  {formatTime(item.started_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
