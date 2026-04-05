import { memo } from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  Clock,
  CheckCircle2,
  Pause,
  Loader2,
  XCircle,
  X,
  RotateCcw,
  Zap,
} from 'lucide-react'
import type { TaskStatus } from '@/types/cron'

interface StatusBadgeProps {
  status: TaskStatus | string
}

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    active: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
    inactive: { variant: 'secondary', icon: <Pause className="w-3 h-3" /> },
    pending: { variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
    running: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
    cancelled: { variant: 'outline', icon: <X className="w-3 h-3" /> },
    cron: { variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
    manual: { variant: 'default', icon: <Zap className="w-3 h-3" /> },
    retry: { variant: 'outline', icon: <RotateCcw className="w-3 h-3" /> },
  }

  const config = variants[status] || variants.inactive

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      <span className="capitalize">{status}</span>
    </Badge>
  )
})
