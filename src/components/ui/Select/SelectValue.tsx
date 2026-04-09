import * as React from 'react'
import { cn } from '@/lib/utils'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { useSelectContext } from './SelectContext'

export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

export const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    return (
      <ErrorBoundary
        fallback={
          <ErrorFallback
            title="SelectValue 错误"
            message="SelectValue 必须在 Select 组件内使用"
            className="min-h-[24px]"
          />
        }
      >
        <SelectValueInner ref={ref} className={className} placeholder={placeholder} {...props} />
      </ErrorBoundary>
    )
  }
)
SelectValue.displayName = 'SelectValue'

const SelectValueInner = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    const { value } = useSelectContext()

    return (
      <span
        ref={ref}
        className={cn('pointer-events-none block truncate text-foreground', className)}
        {...props}
      >
        {value || placeholder}
      </span>
    )
  }
)
SelectValueInner.displayName = 'SelectValueInner'
