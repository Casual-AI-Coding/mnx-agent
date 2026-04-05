import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsFieldProps {
  label: string
  description?: string
  error?: string
  children: ReactNode
  className?: string
}

export function SettingsField({ label, description, error, children, className }: SettingsFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">{label}</label>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
