import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { status, neutralText } from '@/themes/tokens'

interface NodeStatusIndicatorProps {
  status: 'idle' | 'running' | 'completed' | 'error'
  className?: string
}

export function NodeStatusIndicator({ status: statusKey, className }: NodeStatusIndicatorProps) {
  const config: Record<string, { icon: typeof Clock; color: string; bg: string; animate?: boolean }> = {
    idle: { icon: Clock, color: neutralText[400], bg: 'bg-muted' },
    running: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', animate: true },
    completed: { icon: CheckCircle, color: status.success.icon, bg: status.success.bgLight },
    error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  }

  const { icon: Icon, color, bg, animate } = config[statusKey]

  return (
    <div className={cn('rounded-full p-1', bg, className)}>
      <Icon className={cn('w-4 h-4', color, animate && 'animate-spin')} />
    </div>
  )
}
