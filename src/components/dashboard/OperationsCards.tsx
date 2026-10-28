import { memo } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Timer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { status as statusTokens } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import type { OperationsExecutionsStats, OperationsSection } from '@/lib/api/stats'

export interface OperationsCardsProps {
  executions: OperationsSection<OperationsExecutionsStats> | null
  loading?: boolean
}

function formatDuration(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} 分钟`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)} 秒`
  return `${Math.round(ms)} 毫秒`
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

/**
 * 运营指标卡（R-005）：总执行 / 成功率 / 失败率 / 平均耗时。
 * 板块降级（{ error }）或加载中时展示占位状态。
 */
export const OperationsCards = memo(function OperationsCards({ executions, loading }: OperationsCardsProps) {
  const cards = (() => {
    if (!executions) return null
    if ('error' in executions) return { degraded: true as const, message: executions.error }

    const stats = executions
    const riskLevel = stats.failureRate > 0.2 ? statusTokens.error.icon : stats.failureRate > 0.05 ? statusTokens.warning.icon : statusTokens.success.icon
    return {
      degraded: false as const,
      items: [
        { label: '总执行次数', value: stats.totalExecutions.toLocaleString(), icon: Activity, color: 'text-primary-400' },
        { label: '成功率', value: formatPercent(stats.successRate), icon: CheckCircle2, color: statusTokens.success.icon },
        { label: '失败率', value: formatPercent(stats.failureRate), icon: AlertTriangle, color: riskLevel },
        { label: '平均耗时', value: formatDuration(stats.avgDuration), icon: Timer, color: 'text-info' },
      ],
    }
  })()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="operations-cards">
      {cards === null || cards.degraded ? (
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardContent className="p-4 text-sm text-muted-foreground/70">
            {loading
              ? '正在加载运营指标...'
              : cards?.degraded
                ? `运营指标暂不可用：${cards.message}`
                : '暂无运营指标数据'}
          </CardContent>
        </Card>
      ) : (
        cards.items.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn('p-3 rounded-lg bg-card/secondary', item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground truncate">{item.value}</p>
                <p className="text-sm text-muted-foreground/70">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
})
