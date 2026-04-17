import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { BarChart3, TrendingUp, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { getStatsOverview, getSuccessRateTrend, getTaskDistribution, getErrorRanking } from '@/lib/api/stats'
import type { StatsOverview, StatsTrendItem, StatsDistributionItem, StatsErrorItem } from '@/lib/api/stats'
import { toastError } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth'
import { status, services } from '@/themes/tokens'
import { cn } from '@/lib/utils'

export default function StatsDashboard() {
  const { t } = useTranslation()
  const { isHydrated } = useAuthStore()
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [trend, setTrend] = useState<StatsTrendItem[]>([])
  const [distribution, setDistribution] = useState<StatsDistributionItem[]>([])
  const [errors, setErrors] = useState<StatsErrorItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!isHydrated || hasInitializedRef.current) return
    hasInitializedRef.current = true
    loadStats()
  }, [isHydrated])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const [overviewRes, trendRes, distRes, errorsRes] = await Promise.all([
        getStatsOverview(),
        getSuccessRateTrend('day'),
        getTaskDistribution(),
        getErrorRanking(10)
      ])

      if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data)
      if (trendRes.success && trendRes.data) setTrend(trendRes.data)
      if (distRes.success && distRes.data) setDistribution(distRes.data)
      if (errorsRes.success && errorsRes.data) setErrors(errorsRes.data)
    } catch {
      toastError('加载失败', '无法获取统计数据')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5" />}
        title={t('stats.title', '执行统计')}
        description={t('stats.subtitle', '任务执行数据分析')}
        gradient="blue-cyan"
        actions={
          <Button variant="outline" onClick={loadStats}>
            刷新数据
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('stats.totalExecutions', '总执行次数')}
          value={overview?.totalExecutions || 0}
          icon={BarChart3}
          color={status.info.icon}
        />
        <StatCard
          title={t('stats.successRate', '成功率')}
          value={`${((overview?.successRate || 0) * 100).toFixed(1)}%`}
          icon={CheckCircle2}
          color={status.success.icon}
        />
        <StatCard
          title={t('stats.avgDuration', '平均耗时')}
          value={`${Math.round((overview?.avgDuration || 0) / 1000)}s`}
          icon={Clock}
          color={status.warning.icon}
        />
        <StatCard
          title={t('stats.errorCount', '错误次数')}
          value={overview?.errorCount || 0}
          icon={AlertCircle}
          color={status.error.icon}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">{t('stats.successTrend', '成功率趋势')}</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <div className="space-y-2">
                {trend.slice(0, 7).map((item) => (
                  <div key={item.date} className="flex items-center gap-3">
                    <span className="text-muted-foreground/70 text-sm w-24">{item.date}</span>
                    <div className="flex-1 h-2 bg-card/secondary rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', status.success.bg)}
                        style={{ width: `${(item.success / item.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-sm w-16 text-right">
                      {((item.success / item.total) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground/70 text-center py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">{t('stats.taskDistribution', '任务类型分布')}</CardTitle>
          </CardHeader>
          <CardContent>
            {distribution.length > 0 ? (
              <div className="space-y-3">
                {distribution.map((item, idx) => {
                  const total = distribution.reduce((sum, d) => sum + d.count, 0)
                  const percentage = (item.count / total) * 100
                  const colors = [services.text.bgSolid, services.image.bgSolid, services.music.bgSolid, services.video.bgSolid, status.success.bg]
                  return (
                    <div key={item.type} className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-20 capitalize">{item.type}</span>
                      <div className="flex-1 h-6 bg-card/secondary rounded overflow-hidden">
                        <div
                          className={cn('h-full', colors[idx % colors.length])}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-sm w-20 text-right">
                        {item.count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground/70 text-center py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('stats.errorRanking', '错误排行榜')}</CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length > 0 ? (
            <div className="divide-y divide-border">
              {errors.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={idx < 3 ? 'destructive' : 'secondary'}>{idx + 1}</Badge>
                    <span className="text-muted-foreground">{item.errorSummary}</span>
                  </div>
                  <span className="text-muted-foreground/70">{item.count} 次</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground/70 text-center py-8">暂无错误记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  compact = true,
}: {
  title: string
  value: string | number
  icon: typeof BarChart3
  color: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1 }}
        transition={{ type: 'spring', stiffness: 400 }}
        className="relative overflow-hidden rounded-lg border border-border/50 shadow-sm"
      >
        <div className={cn('absolute inset-0 opacity-15 bg-gradient-to-br', color)} />
        <div className="relative flex items-center gap-2.5 px-3 py-1">
          <div className={cn('p-1.5 rounded-md bg-gradient-to-br shadow-sm', color)}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-base font-bold text-foreground">{value}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-card/secondary', color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground/70 text-sm">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}