import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { taskStatus } from '@/themes/tokens'

export function ProgressBar({
  progress,
  status,
  animated = false,
}: {
  progress: number
  status: string
  animated?: boolean
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return taskStatus.completed.dot
      case 'failed':
        return taskStatus.failed.dot
      case 'cancelled':
        return taskStatus.cancelled.dot
      case 'running':
        return taskStatus.running.dot
      default:
        return 'bg-primary'
    }
  }

  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full', getStatusColor())}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: animated ? 0.3 : 0, ease: 'easeOut' }}
      />
    </div>
  )
}
