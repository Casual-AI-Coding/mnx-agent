import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { services, status as statusTokens } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import type { HistoryItem } from '@/stores/history'

export interface RecentActivityCardProps {
  items: HistoryItem[]
  timeAgo: (date: Date) => string
}

const TYPE_LABEL_KEYS = ['text', 'image', 'voice', 'music', 'video'] as const

const TYPE_COLORS: Record<string, string> = {
  text: cn(services.text.bg, services.text.icon),
  image: cn(services.image.bg, services.image.icon),
  voice: cn(statusTokens.success.bgSubtle, statusTokens.success.icon),
  music: cn(services.music.bg, services.music.icon),
  video: cn(services.video.bg, services.video.icon),
}

/**
 * 最近活动列表（Dashboard 本地历史）。
 */
export const RecentActivityCard = memo(function RecentActivityCard({ items, timeAgo }: RecentActivityCardProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary-400" />
        {t('dashboard.recentActivity')}
      </h2>
      <Card>
        <CardContent className="p-0">
          {items.length > 0 ? (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/50 transition-colors">
                  <Badge className={TYPE_COLORS[item.type] || 'bg-card/secondary text-muted-foreground'}>
                    {TYPE_LABEL_KEYS.includes(item.type as (typeof TYPE_LABEL_KEYS)[number]) ? t(`dashboard.${item.type}`) : item.type}
                  </Badge>
                  <span className="flex-1 text-sm text-muted-foreground truncate">
                    {item.input || t('dashboard.noActivity')}
                  </span>
                  <span className="text-xs text-muted-foreground/50 whitespace-nowrap">
                    {timeAgo(new Date(item.timestamp))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground/70">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('dashboard.noActivity')}</p>
              <p className="text-sm mt-1">{t('dashboard.noActivityDesc')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})
