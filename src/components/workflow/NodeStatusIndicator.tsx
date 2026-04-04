import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

interface NodeStatusIndicatorProps {
  status: 'idle' | 'running' | 'completed' | 'error'
  className?: string
}

export function NodeStatusIndicator({ status, className }: NodeStatusIndicatorProps) {
  const config: Record<string, { icon: typeof Clock; color: string; bg: string; animate?: boolean }> = {
    idle: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100' },
    running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', animate: true },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  }

  const { icon: Icon, color, bg, animate } = config[status]

  return (
    <div className={cn('rounded-full p-1', bg, className)}>
      <Icon className={cn('w-4 h-4', color, animate && 'animate-spin')} />
    </div>
  )
}
