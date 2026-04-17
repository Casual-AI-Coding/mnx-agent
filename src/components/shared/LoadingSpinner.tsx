import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function LoadingSpinner({ className, size = 'md', fullScreen = true }: LoadingSpinnerProps) {
  const spinner = <Loader2 className={cn('animate-spin text-primary', SIZE_CLASSES[size])} />

  if (fullScreen) {
    return (
      <div className={cn('flex items-center justify-center min-h-screen bg-background', className)}>
        {spinner}
      </div>
    )
  }

  return spinner
}