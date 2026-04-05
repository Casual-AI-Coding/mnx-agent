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
import { cn } from '@/lib/utils'
import { taskStatus, status } from '@/themes/tokens'

interface StatusBadgeProps {
  status: TaskStatus | string
}

export const StatusBadge = memo(function StatusBadge({ status: taskStatusValue }: StatusBadgeProps) {
  const variants: Record<string, { 
    className: string
    icon: React.ReactNode 
  }> = {
    active: { 
      className: cn(taskStatus.completed.bg, taskStatus.completed.text, taskStatus.completed.border), 
      icon: <CheckCircle2 className={cn('w-3 h-3', taskStatus.completed.dot)} /> 
    },
    inactive: { 
      className: cn(taskStatus.pending.bg, taskStatus.pending.text, taskStatus.pending.border), 
      icon: <Pause className={cn('w-3 h-3', taskStatus.pending.dot)} /> 
    },
    pending: { 
      className: cn(taskStatus.pending.bg, taskStatus.pending.text, taskStatus.pending.border), 
      icon: <Clock className={cn('w-3 h-3', taskStatus.pending.dot)} /> 
    },
    running: { 
      className: cn(taskStatus.running.bg, taskStatus.running.text, taskStatus.running.border), 
      icon: <Loader2 className={cn('w-3 h-3 animate-spin', taskStatus.running.dot)} /> 
    },
    completed: { 
      className: cn(taskStatus.completed.bg, taskStatus.completed.text, taskStatus.completed.border), 
      icon: <CheckCircle2 className={cn('w-3 h-3', taskStatus.completed.dot)} /> 
    },
    failed: { 
      className: cn(taskStatus.failed.bg, taskStatus.failed.text, taskStatus.failed.border), 
      icon: <XCircle className={cn('w-3 h-3', taskStatus.failed.dot)} /> 
    },
    cancelled: { 
      className: cn(taskStatus.cancelled.bg, taskStatus.cancelled.text, taskStatus.cancelled.border), 
      icon: <X className={cn('w-3 h-3', taskStatus.cancelled.dot)} /> 
    },
    cron: { 
      className: cn(status.info.bgLight, status.info.text, status.info.border), 
      icon: <Clock className={cn('w-3 h-3', status.info.icon)} /> 
    },
    manual: { 
      className: cn(status.success.bgLight, status.success.text, status.success.border), 
      icon: <Zap className={cn('w-3 h-3', status.success.icon)} /> 
    },
    retry: { 
      className: cn(status.warning.bgLight, status.warning.text, status.warning.border), 
      icon: <RotateCcw className={cn('w-3 h-3', status.warning.icon)} /> 
    },
  }

  const config = variants[taskStatusValue] || variants.inactive

  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      {config.icon}
      <span className="capitalize">{taskStatusValue}</span>
    </Badge>
  )
})
