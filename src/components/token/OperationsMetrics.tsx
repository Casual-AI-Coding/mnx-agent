import { useCallback, useEffect, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, Timer, Gauge, TrendingUp, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ServiceDistribution } from '@/components/dashboard/ServiceDistribution'
import { getOperationsOverview, getSuccessRateTrend, type OperationsOverview, type StatsTrendItem } from '@/lib/api/stats'
import { status as statusTokens } from '@/themes/tokens'
import { cn } from '@/lib/utils'

const TREND_PERIODS = [
  { value: 'day', label: '按天' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
] as const

type TrendPeriod = (typeof TREND_PERIODS)[number]['value']

function formatDuration(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} 分钟`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)} 秒`
  return `${Math.round(ms)} 毫秒`
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

/**
 * 用量监控·运营指标区（R-022）
 *
 * 与 Dashboard 运营总览共享同一数据源（GET /api/stats/operations）：
 * 真实后端执行统计、各服务调用占比、配额快照（含风险）、
 * 以及成功/失败执行趋势（按天/周/月）。
 */
export function OperationsMetrics() {
  const [operations, setOperations] = useState<OperationsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<TrendPeriod>('day')
  const [trend, setTrend] = useState<StatsTrendItem[] | null>(null)
  const [trendLoading, setTrendLoading] = useState(true)

  const loadOperations = useCallback(async () => {
    setLoading(true)
    const result = await getOperationsOverview()
    setOperations(result.success ? result.data ?? null : null)
    setLoading(false)
  }, [])

  const loadTrend = useCallback(async (p: TrendPeriod) => {
    setTrendLoading(true)
    const result = await getSuccessRateTrend(p)
    setTrend(result.success ? result.data ?? null : null)
    setTrendLoading(false)
  }, [])

  useEffect(() => {
    void loadOperations()
  }, [loadOperations])

  useEffect(() => {
    void loadTrend(period)
  }, [period, loadTrend])

  const executions = operations && !('error' in operations.executions) ? operations.executions : null
  const capacity = operations && !('error' in operations.capacity) ? operations.capacity : null
  const distribution = operations?.distribution ?? null
  const maxTrendTotal = trend && trend.length > 0 ? Math.max(...trend.map(t => t.total), 1) : 1

  return (
    <div className="space-y-6" data-testid="operations-metrics">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary-400" />
          运营指标（后端统计）
        </h2>
        <Button variant="ghost" size="sm" onClick={() => void loadOperations()} disabled={loading} aria-label="刷新运营指标">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {executions ? (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary-400" />
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">{executions.totalExecutions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground/70">总执行次数</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className={cn('w-5 h-5', statusTokens.success.icon)} />
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">{formatPercent(executions.successRate)}</p>
                  <p className="text-xs text-muted-foreground/70">成功率</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className={cn('w-5 h-5', executions.failureRate > 0.2 ? statusTokens.error.icon : statusTokens.warning.icon)} />
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">{formatPercent(executions.failureRate)}</p>
                  <p className="text-xs text-muted-foreground/70">失败率</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Timer className="w-5 h-5 text-info" />
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">{formatDuration(executions.avgDuration)}</p>
                  <p className="text-xs text-muted-foreground/70">平均耗时</p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="p-4 text-sm text-muted-foreground/70">
              {loading ? '正在加载运营指标...' : '运营指标暂不可用（后端统计未返回数据）'}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ServiceDistribution distribution={distribution} loading={loading} />

        <Card data-testid="capacity-snapshot">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">配额快照</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {capacity === null ? (
              <p className="text-sm text-muted-foreground/70 py-2">
                {loading ? '正在加载配额快照...' : '配额快照暂不可用'}
              </p>
            ) : capacity.records.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 py-2">还没有配额记录，使用生成服务后自动建立。</p>
            ) : (
              capacity.records.map((record) => {
                const usedRatio = Math.min(record.usage_ratio, 1)
                const risky = record.total_quota > 0 && record.remaining_quota / record.total_quota < 0.2
                return (
                  <div key={record.service_type} className="space-y-1" data-testid={`capacity-${record.service_type}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        {record.service_type}
                        {risky && (
                          <span className={cn('px-1.5 rounded-full text-[10px] font-medium', statusTokens.error.bgSubtle, statusTokens.error.text)}>
                            余量不足
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground/70 tabular-nums">
                        {record.remaining_quota.toLocaleString()} / {record.total_quota.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', usedRatio > 0.8 ? statusTokens.error.bg : usedRatio > 0.5 ? statusTokens.warning.bg : statusTokens.success.bg)}
                        style={{ width: `${Math.max(usedRatio * 100, 1)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="execution-trend">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              执行趋势
            </CardTitle>
            <div className="flex gap-1" role="tablist" aria-label="趋势周期">
              {TREND_PERIODS.map((p) => (
                <button
                  key={p.value}
                  role="tab"
                  aria-selected={period === p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs transition-colors',
                    period === p.value ? 'bg-primary-400/10 text-primary-400 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <p className="text-sm text-muted-foreground/70 py-4">正在加载执行趋势...</p>
          ) : trend === null ? (
            <p className="text-sm text-muted-foreground/70 py-4">执行趋势暂不可用</p>
          ) : trend.length === 0 ? (
            <p className="text-sm text-muted-foreground/70 py-4">当前周期还没有执行记录。</p>
          ) : (
            <div className="space-y-2.5">
              {trend.map((item) => {
                const rate = item.total > 0 ? item.success / item.total : 0
                return (
                  <div key={item.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground tabular-nums">{item.date}</span>
                      <span className="text-muted-foreground/70 tabular-nums">
                        {item.total} 次 · 成功 {item.success} · 失败 {item.failed}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', rate >= 0.95 ? statusTokens.success.bg : rate >= 0.8 ? statusTokens.warning.bg : statusTokens.error.bg)}
                        style={{ width: `${Math.max((item.total / maxTrendTotal) * 100, 2)}%` }}
                        title={`成功率 ${(rate * 100).toFixed(0)}%`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
