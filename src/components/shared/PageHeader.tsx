import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}