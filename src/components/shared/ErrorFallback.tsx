import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ErrorFallbackProps {
  error?: Error
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export default function ErrorFallback({
  error,
  title = '出错了',
  message = '页面遇到意外错误，请尝试刷新。',
  onRetry,
  className,
}: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV

  return (
    <div className={cn('flex items-center justify-center p-4', className)}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          {isDev && error && (
            <div className="p-3 bg-muted rounded-lg overflow-auto">
              <p className="text-xs font-mono text-destructive whitespace-pre-wrap">
                {error.message}
                {error.stack && (
                  <>
                    {'\n\n'}
                    {error.stack}
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
        {onRetry && (
          <CardFooter>
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}