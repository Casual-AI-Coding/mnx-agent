import { Crown, Shield, Star, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type UserRole = 'super' | 'admin' | 'pro' | 'user'

export interface User {
  id: string
  username: string
  email: string | null
  minimax_api_key: string | null
  minimax_region: string
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type SortField = 'username' | 'role' | 'created_at' | 'last_login_at'
export type SortOrder = 'asc' | 'desc'

export interface FilterChip {
  id: string
  type: 'search' | 'role' | 'status'
  label: string
  value: string
}

export const ROLE_CONFIG: Record<UserRole, {
  label: string
  icon: React.ReactNode
  gradient: string
  bgClass: string
  color: string
}> = {
  super: {
    label: 'Super',
    icon: <Crown className="w-3 h-3" />,
    gradient: 'from-amber-500 to-orange-500',
    bgClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    color: 'text-amber-500',
  },
  admin: {
    label: 'Admin',
    icon: <Shield className="w-3 h-3" />,
    gradient: 'from-blue-500 to-cyan-500',
    bgClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    color: 'text-blue-500',
  },
  pro: {
    label: 'Pro',
    icon: <Star className="w-3 h-3" />,
    gradient: 'from-purple-500 to-pink-500',
    bgClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    color: 'text-purple-500',
  },
  user: {
    label: 'User',
    icon: <UserIcon className="w-3 h-3" />,
    gradient: 'from-emerald-500 to-teal-500',
    bgClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    color: 'text-emerald-500',
  },
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '从未登录'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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