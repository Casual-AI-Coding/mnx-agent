import { AlertTriangle, CheckCircle2, Package, RotateCcw, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { status } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import type { DLQStatsCardsProps, DLQAutoRetryCardProps } from './types'

export function DLQStatsCards({ unresolvedCount, resolvedCount, totalCount }: DLQStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{unresolvedCount}</p>
              <p className="text-xs text-muted-foreground/70">Unresolved</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', status.success.bgSubtle)}>
              <CheckCircle2 className={cn('w-5 h-5', status.success.icon)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground/70">Resolved</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
              <p className="text-xs text-muted-foreground/70">Total Items</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function DLQAutoRetryCard({
  autoRetryStats,
  onToggleAutoRetry,
  onConfigure,
}: DLQAutoRetryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Auto-Retry
          </CardTitle>
          <Switch
            checked={autoRetryStats?.enabled ?? false}
            onCheckedChange={onToggleAutoRetry}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{autoRetryStats?.pendingRetryCount ?? 0}</span>
            <span>pending retries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{autoRetryStats?.dlqItemCount ?? 0}</span>
            <span>DLQ items</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={onConfigure}>
          <Settings className="w-4 h-4 mr-1" />
          Configure
        </Button>
      </CardFooter>
    </Card>
  )
}
