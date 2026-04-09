import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectGroup = React.forwardRef<HTMLDivElement, SelectGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('overflow-hidden p-1', className)}
        {...props}
      />
    )
  }
)
SelectGroup.displayName = 'SelectGroup'
