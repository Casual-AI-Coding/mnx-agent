import type { LucideIcon } from 'lucide-react'

export type UserRole = 'super' | 'admin' | 'pro' | 'user'

export interface ServiceNodePermission {
  id: string
  service_name: string
  method_name: string
  display_name: string
  category: string
  min_role: UserRole
  is_enabled: boolean
}

export interface RoleConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  color: string
}

export interface CategoryConfig {
  icon: LucideIcon
  gradient: string
  bgGradient: string
  borderColor: string
  glowColor: string
}

export interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
  compact?: boolean
}

export interface NodeCardProps {
  node: ServiceNodePermission
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
  gradient: string
}

export interface CategorySectionProps {
  category: string
  nodes: ServiceNodePermission[]
  saving: string | null
  updateNode: (id: string, updates: { min_role?: UserRole; is_enabled?: boolean }) => void
}
