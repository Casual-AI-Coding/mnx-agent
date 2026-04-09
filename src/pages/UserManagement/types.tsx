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

export interface FormData {
  username: string
  password: string
  email: string
  role: UserRole
  minimax_api_key: string
}

export interface UseUserManagementReturn {
  // Data
  users: User[]
  totalUsers: number
  filteredAndSortedUsers: User[]
  filterChips: FilterChip[]
  activeUsers: number
  inactiveUsers: number

  // Loading states
  loading: boolean
  error: string | null
  actionLoading: boolean

  // Pagination
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void

  // Filters
  searchQuery: string
  roleFilter: UserRole | 'all'
  statusFilter: 'all' | 'active' | 'inactive'
  hasActiveFilters: boolean
  setSearchQuery: (query: string) => void
  setRoleFilter: (role: UserRole | 'all') => void
  setStatusFilter: (status: 'all' | 'active' | 'inactive') => void
  removeFilterChip: (chip: FilterChip) => void
  clearAllFilters: () => void

  // Sorting
  sortField: SortField
  sortOrder: SortOrder
  toggleSort: (field: SortField) => void

  // Selection
  selectedUserIds: Set<string>
  toggleUserSelection: (userId: string) => void
  selectAllUsers: () => void
  deselectAllUsers: () => void
  isAllSelected: boolean
  hasSelection: boolean

  // Dialog states
  createDialogOpen: boolean
  editDialogOpen: boolean
  deleteDialogOpen: boolean
  batchDeleteDialogOpen: boolean
  resetPasswordConfirmOpen: boolean
  resetPasswordDialogOpen: boolean

  // Selected user for actions
  selectedUser: User | null

  // Dialog controls
  setCreateDialogOpen: (open: boolean) => void
  setEditDialogOpen: (open: boolean) => void
  setDeleteDialogOpen: (open: boolean) => void
  setBatchDeleteDialogOpen: (open: boolean) => void
  setResetPasswordConfirmOpen: (open: boolean) => void
  setResetPasswordDialogOpen: (open: boolean) => void

  // Form
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void

  // Reset password
  newPassword: string
  copied: boolean
  handleCopyPassword: () => Promise<void>

  // Actions
  openEditDialog: (user: User) => void
  openDeleteDialog: (user: User) => void
  openResetPasswordConfirm: (user: User) => void
  handleCreate: () => Promise<void>
  handleEdit: () => Promise<void>
  handleDelete: () => Promise<void>
  handleToggleActive: (user: User) => Promise<void>
  handleResetPassword: () => Promise<void>
  handleBatchActivate: () => Promise<void>
  handleBatchDeactivate: () => Promise<void>
  handleBatchDelete: () => Promise<void>
  fetchUsers: () => Promise<void>
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