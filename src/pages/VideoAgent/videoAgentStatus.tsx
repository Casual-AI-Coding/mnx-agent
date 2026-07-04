import { AlertCircle, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import type { TaskStatus } from './VideoHistoryList.js'

export function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-muted-foreground" />
    case 'processing':
      return <Loader2 className="w-5 h-5 animate-spin text-primary" />
    case 'completed':
      return <CheckCircle className={cn('w-5 h-5', statusTokens.success.icon)} />
    case 'failed':
      return <XCircle className="w-5 h-5 text-destructive" />
    default:
      return <AlertCircle className="w-5 h-5 text-muted-foreground" />
  }
}

export function getStatusBadge(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">等待中</Badge>
    case 'processing':
      return <Badge variant="default">处理中</Badge>
    case 'completed':
      return <Badge variant="secondary" className={cn(statusTokens.success.bgSubtle, statusTokens.success.text)}>已完成</Badge>
    case 'failed':
      return <Badge variant="destructive">失败</Badge>
    default:
      return <Badge variant="outline">未知</Badge>
  }
}

export function formatDuration(seconds?: number) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
