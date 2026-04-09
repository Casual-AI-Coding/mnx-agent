import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-muted', className)}
        {...props}
      />
    )
  }
)
SelectSeparator.displayName = 'SelectSeparator'
