import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-2 py-1.5 text-sm font-semibold', className)}
        {...props}
      />
    )
  }
)
SelectLabel.displayName = 'SelectLabel'
