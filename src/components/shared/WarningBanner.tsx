import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface WarningBannerProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
  className?: string
}

export default function WarningBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
  className,
}: WarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      className={cn(
        'bg-yellow-600/20 text-yellow-400 p-4 rounded-lg flex items-center gap-3 mb-6',
        className
      )}
    >
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-medium hover:text-yellow-300 transition-colors"
        >
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-yellow-600/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}