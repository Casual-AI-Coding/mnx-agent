import { memo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Archive, Database, HeartPulse } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { status as statusTokens } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import type { OperationsCapacity, OperationsDlqSummary, OperationsHealth, OperationsSection } from '@/lib/api/stats'

export interface SystemHealthStripProps {
  health: OperationsSection<OperationsHealth> | null
  dlq: OperationsSection<OperationsDlqSummary> | null
  capacity: OperationsSection<OperationsCapacity> | null
  loading?: boolean
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分`
  return `${minutes} 分钟`
}

function DegradedHint({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground/70">数据暂不可用：{message}</p>
}

/**
 * 系统健康条（R-005）：数据库状态 / 运行时长 / 连接池 + DLQ 摘要 + 容量风险三块入口。
 */
export const SystemHealthStrip = memo(function SystemHealthStrip({ health, dlq, capacity, loading }: SystemHealthStripProps) {
  const healthOk = health != null && !('error' in health)
  const dlqOk = dlq != null && !('error' in dlq)
  const capacityOk = capacity != null && !('error' in capacity)
  const pool = healthOk && health.pool ? health.pool : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="system-health-strip">
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-primary-400" />
            系统健康
          </h3>
          {health === null ? (
            <p className="text-xs text-muted-foreground/70">{loading ? '正在加载健康状态...' : '暂无健康数据'}</p>
          ) : !healthOk ? (
            <DegradedHint message={health.error} />
          ) : (
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Database className={cn('w-4 h-4', health.database ? statusTokens.success.icon : statusTokens.error.icon)} />
                <span className="text-muted-foreground">数据库</span>
                <span className={cn('ml-auto text-xs font-medium', health.database ? statusTokens.success.text : statusTokens.error.text)}>
                  {health.database ? '连接正常' : '连接异常'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>运行时长</span>
                <span className="tabular-nums">{formatUptime(health.uptimeSeconds)}</span>
              </div>
              {pool && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>连接池（{pool.status === 'healthy' ? '健康' : '拥塞'}）</span>
                  <span className="tabular-nums">
                    {pool.pool.idleCount}/{pool.pool.totalCount} 空闲
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-warning" />
              死信队列
            </h3>
            <Link to="/dead-letter-queue" className="text-xs text-muted-foreground hover:text-foreground">
              前往处理
            </Link>
          </div>
          {dlq === null ? (
            <p className="text-xs text-muted-foreground/70">{loading ? '正在加载死信队列...' : '暂无死信数据'}</p>
          ) : !dlqOk ? (
            <DegradedHint message={dlq.error} />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={cn('text-2xl font-bold tabular-nums', dlq.unresolvedCount > 0 ? statusTokens.warning.text : statusTokens.success.text)}>
                {dlq.unresolvedCount}
              </span>
              <span className="text-xs text-muted-foreground">条待处理死信任务</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-info" />
              容量风险
            </h3>
            <Link to="/token" className="text-xs text-muted-foreground hover:text-foreground">
              用量监控
            </Link>
          </div>
          {capacity === null ? (
            <p className="text-xs text-muted-foreground/70">{loading ? '正在加载容量快照...' : '暂无容量数据'}</p>
          ) : !capacityOk ? (
            <DegradedHint message={capacity.error} />
          ) : capacity.atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">各服务容量充足</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {capacity.atRisk.map((service) => (
                <span
                  key={service}
                  className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusTokens.error.bgSubtle, statusTokens.error.text)}
                >
                  {service}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})
