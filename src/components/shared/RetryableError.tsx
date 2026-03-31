import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface RetryableErrorProps {
  error: string | Error
  onRetry: () => void
  retryCount?: number
  maxRetries?: number
  className?: string
}

export function RetryableError({
  error,
  onRetry,
  retryCount = 0,
  maxRetries = 3,
  className,
}: RetryableErrorProps) {
  const errorMessage = typeof error === 'string' ? error : error.message
  const maxReached = retryCount >= maxRetries

  return (
    <div
      className={cn(
        'max-w-md mx-auto p-6 rounded-lg border border-destructive/50 bg-card text-center',
        className
      )}
    >
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-destructive/10 rounded-full">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
      </div>

      <p className="text-destructive mb-4">{errorMessage}</p>

      {maxReached ? (
        <p className="text-sm text-muted-foreground">
          Max retries reached. Please try again later.
        </p>
      ) : (
        <div className="space-y-3">
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>

          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Attempt {retryCount} of {maxRetries}
            </p>
          )}
        </div>
      )}
    </div>
  )
}