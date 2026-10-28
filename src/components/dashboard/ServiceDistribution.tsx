import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { services } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import type { OperationsSection } from '@/lib/api/stats'

export interface ServiceDistributionProps {
  distribution: OperationsSection<{ type: string; count: number }[]> | null
  loading?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
  voice: '语音',
  music: '音乐',
  video: '视频',
  lyrics: '歌词',
  video_agent: '视频智能体',
  workflow: '工作流',
  cron: '定时任务',
}

const TYPE_TOKENS: Partial<Record<string, { bg: string; icon: string }>> = {
  text: services.text,
  image: services.image,
  voice: services.voice,
  music: services.music,
  video: services.video,
  workflow: services.workflow,
  cron: services.cron,
}

function labelFor(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function tokenFor(type: string): { bg: string; icon: string } {
  return TYPE_TOKENS[type] ?? { bg: 'bg-primary-400', icon: 'text-primary-400' }
}

/**
 * 服务分布（R-005）：按执行类型展示占比条形。
 */
export const ServiceDistribution = memo(function ServiceDistribution({ distribution, loading }: ServiceDistributionProps) {
  const degraded = distribution != null && 'error' in distribution
  const items = distribution != null && !('error' in distribution) ? distribution : []
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const sorted = [...items].sort((a, b) => b.count - a.count)

  return (
    <Card data-testid="service-distribution">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">服务分布</h3>
          <Link to="/stats" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            统计详情 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {distribution === null ? (
          <p className="text-sm text-muted-foreground/70 py-4">{loading ? '正在加载服务分布...' : '暂无服务分布数据'}</p>
        ) : degraded ? (
          <p className="text-sm text-muted-foreground/70 py-4">服务分布暂不可用：{distribution.error}</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-4">还没有执行记录，跑一个任务试试。</p>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((item) => {
              const token = tokenFor(item.type)
              const ratio = total > 0 ? item.count / total : 0
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{labelFor(item.type)}</span>
                    <span className="text-muted-foreground/70 tabular-nums">
                      {item.count.toLocaleString()} · {(ratio * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', token.bg)}
                      style={{ width: `${Math.max(ratio * 100, 2)}%` }}
                      data-testid={`distribution-bar-${item.type}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
