import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/5 animate-[pulse_3s_ease-in-out_infinite]">
          <Icon className="w-10 h-10 text-primary/70" />
        </div>
      )}
      <h3 className="text-2xl font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-base max-w-md mb-6">{description}</p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}