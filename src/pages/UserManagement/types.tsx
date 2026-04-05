import { Crown, Shield, Star, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roles } from '@/themes/tokens/index'

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
    gradient: roles.super.gradient,
    bgClass: cn(roles.super.bgLight, roles.super.text, roles.super.border),
    color: roles.super.text,
  },
  admin: {
    label: 'Admin',
    icon: <Shield className="w-3 h-3" />,
    gradient: roles.admin.gradient,
    bgClass: cn(roles.admin.bgLight, roles.admin.text, roles.admin.border),
    color: roles.admin.text,
  },
  pro: {
    label: 'Pro',
    icon: <Star className="w-3 h-3" />,
    gradient: roles.pro.gradient,
    bgClass: cn(roles.pro.bgLight, roles.pro.text, roles.pro.border),
    color: roles.pro.text,
  },
  user: {
    label: 'User',
    icon: <UserIcon className="w-3 h-3" />,
    gradient: roles.user.gradient,
    bgClass: cn(roles.user.bgLight, roles.user.text, roles.user.border),
    color: roles.user.text,
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