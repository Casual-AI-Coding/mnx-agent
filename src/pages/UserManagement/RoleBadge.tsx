import { cn } from '@/lib/utils'
import { ROLE_CONFIG, type UserRole } from './types'

export function RoleBadge({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role]
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      config.bgClass
    )}>
      {config.icon}
      {config.label}
    </div>
  )
}
