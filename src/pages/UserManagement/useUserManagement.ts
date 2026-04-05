import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'
import type { User, UserRole, SortField, SortOrder, FilterChip } from './types'
import { ROLE_CONFIG } from './types'

interface FormData {
  username: string
  password: string
  email: string
  role: UserRole
  minimax_api_key: string
}

interface UseUserManagementReturn {
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

export function useUserManagement(): UseUserManagementReturn {
  const [searchParams, setSearchParams] = useSearchParams()

  // Data state
  const [users, setUsers] = useState<User[]>([])
  const [totalUsers, setTotalUsers] = useState(0)

  // Pagination
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(searchParams.get('page') || '1', 10)
    return isNaN(page) || page < 1 ? 1 : page
  })
  const [pageSize, setPageSize] = useState(() => {
    const size = parseInt(searchParams.get('size') || '20', 10)
    return [20, 50, 100].includes(size) ? size : 20
  })

  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [resetPasswordConfirmOpen, setResetPasswordConfirmOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)

  // Selected user
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  // Form
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    email: '',
    role: 'user',
    minimax_api_key: '',
  })

  // Reset password
  const [newPassword, setNewPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<{
        success: boolean
        data: User[]
        pagination: { total: number; page: number; limit: number; totalPages: number }
        error?: string
      }>(`/users?page=${currentPage}&limit=${pageSize}`)
      if (data.success) {
        setUsers(data.data)
        setTotalUsers(data.pagination.total)
      } else {
        setError(data.error || '获取用户列表失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Computed values
  const activeUsers = useMemo(() => users.filter(u => u.is_active).length, [users])
  const inactiveUsers = useMemo(() => users.filter(u => !u.is_active).length, [users])

  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' ? user.is_active : !user.is_active)
      return matchesSearch && matchesRole && matchesStatus
    })

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'username':
          comparison = a.username.localeCompare(b.username)
          break
        case 'role':
          const roleOrder = { super: 0, admin: 1, pro: 2, user: 3 }
          comparison = roleOrder[a.role] - roleOrder[b.role]
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'last_login_at':
          const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0
          const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0
          comparison = aTime - bTime
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortOrder])

  const filterChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = []
    if (searchQuery) {
      chips.push({ id: 'search', type: 'search', label: `搜索: "${searchQuery}"`, value: searchQuery })
    }
    if (roleFilter !== 'all') {
      chips.push({ id: 'role', type: 'role', label: `角色: ${ROLE_CONFIG[roleFilter].label}`, value: roleFilter })
    }
    if (statusFilter !== 'all') {
      chips.push({ id: 'status', type: 'status', label: `状态: ${statusFilter === 'active' ? '已启用' : '已禁用'}`, value: statusFilter })
    }
    return chips
  }, [searchQuery, roleFilter, statusFilter])

  const hasActiveFilters = filterChips.length > 0

  const removeFilterChip = useCallback((chip: FilterChip) => {
    switch (chip.type) {
      case 'search':
        setSearchQuery('')
        break
      case 'role':
        setRoleFilter('all')
        break
      case 'status':
        setStatusFilter('all')
        break
    }
  }, [])

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setRoleFilter('all')
    setStatusFilter('all')
  }, [])

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }, [sortField, sortOrder])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.set('page', page.toString())
      return newParams
    })
  }, [setSearchParams])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1)
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.set('page', '1')
      newParams.set('size', size.toString())
      return newParams
    })
  }, [setSearchParams])

  const handleCreate = useCallback(async () => {
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; data: User; error?: string }>('/users', {
        username: formData.username,
        password: formData.password,
        email: formData.email || null,
        role: formData.role,
        minimax_api_key: formData.minimax_api_key || null,
      })
      if (data.success) {
        setCreateDialogOpen(false)
        setFormData({ username: '', password: '', email: '', role: 'user', minimax_api_key: '' })
        fetchUsers()
      } else {
        toast.error(data.error || '创建用户失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }, [formData, fetchUsers])

  const handleEdit = useCallback(async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const data = await apiClient.patch<{ success: boolean; data: User; error?: string }>(`/users/${selectedUser.id}`, {
        email: formData.email || null,
        role: formData.role,
        minimax_api_key: formData.minimax_api_key || null,
      })
      if (data.success) {
        setEditDialogOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast.error(data.error || '更新用户失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }, [selectedUser, formData, fetchUsers])

  const handleToggleActive = useCallback(async (user: User) => {
    try {
      const data = await apiClient.patch<{ success: boolean; error?: string }>(`/users/${user.id}`, {
        is_active: !user.is_active,
      })
      if (data.success) {
        fetchUsers()
      } else {
        toast.error(data.error || '操作失败')
      }
    } catch {
      toast.error('网络错误')
    }
  }, [fetchUsers])

  const handleDelete = useCallback(async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const data = await apiClient.delete<{ success: boolean; error?: string }>(`/users/${selectedUser.id}`)
      if (data.success) {
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast.error(data.error || '删除用户失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }, [selectedUser, fetchUsers])

  const openEditDialog = useCallback((user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      role: user.role,
      minimax_api_key: user.minimax_api_key || '',
    })
    setEditDialogOpen(true)
  }, [])

  const openDeleteDialog = useCallback((user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }, [])

  const openResetPasswordConfirm = useCallback((user: User) => {
    setSelectedUser(user)
    setResetPasswordConfirmOpen(true)
  }, [])

  const handleResetPassword = useCallback(async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; data?: { newPassword: string; message: string }; error?: string }>(`/users/${selectedUser.id}/reset-password`)
      if (data.success && data.data?.newPassword) {
        setNewPassword(data.data.newPassword)
        setResetPasswordConfirmOpen(false)
        setResetPasswordDialogOpen(true)
        toast.success('密码重置成功')
      } else {
        toast.error(data.error || '重置密码失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }, [selectedUser])

  const handleCopyPassword = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(newPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('密码已复制到剪贴板')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }, [newPassword])

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  const selectAllUsers = useCallback(() => {
    setSelectedUserIds(new Set(filteredAndSortedUsers.map(u => u.id)))
  }, [filteredAndSortedUsers])

  const deselectAllUsers = useCallback(() => {
    setSelectedUserIds(new Set())
  }, [])

  const handleBatchActivate = useCallback(async () => {
    if (selectedUserIds.size === 0) return
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; data?: { successCount: number; failCount: number }; error?: string }>('/users/batch', {
        action: 'activate',
        userIds: Array.from(selectedUserIds),
      })
      if (data.success) {
        toast.success(`已启用 ${data.data?.successCount || 0} 个用户`)
        setSelectedUserIds(new Set())
        fetchUsers()
      } else {
        toast.error(data.error || '批量启用失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }, [selectedUserIds, fetchUsers])

  const handleBatchDeactivate = useCallback(async () => {
    if (selectedUserIds.size === 0) return
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; data?: { successCount: number; failCount: number }; error?: string }>('/users/batch', {
        action: 'deactivate',
        userIds: Array.from(selectedUserIds),
      })
      if (data.success) {
        toast.success(`已禁用 ${data.data?.successCount || 0} 个用户`)
        setSelectedUserIds(new Set())
        fetchUsers()
      } else {
        toast.error(data.error || '批量禁用失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }, [selectedUserIds, fetchUsers])

  const handleBatchDelete = useCallback(async () => {
    if (selectedUserIds.size === 0) return
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; data?: { successCount: number; failCount: number }; error?: string }>('/users/batch', {
        action: 'delete',
        userIds: Array.from(selectedUserIds),
      })
      if (data.success) {
        toast.success(`已删除 ${data.data?.successCount || 0} 个用户`)
        setBatchDeleteDialogOpen(false)
        setSelectedUserIds(new Set())
        fetchUsers()
      } else {
        toast.error(data.error || '批量删除失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }, [selectedUserIds, fetchUsers])

  const isAllSelected = filteredAndSortedUsers.length > 0 && selectedUserIds.size === filteredAndSortedUsers.length
  const hasSelection = selectedUserIds.size > 0

  return {
    // Data
    users,
    totalUsers,
    filteredAndSortedUsers,
    filterChips,
    activeUsers,
    inactiveUsers,

    // Loading states
    loading,
    error,
    actionLoading,

    // Pagination
    currentPage,
    pageSize,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,

    // Filters
    searchQuery,
    roleFilter,
    statusFilter,
    hasActiveFilters,
    setSearchQuery,
    setRoleFilter,
    setStatusFilter,
    removeFilterChip,
    clearAllFilters,

    // Sorting
    sortField,
    sortOrder,
    toggleSort,

    // Selection
    selectedUserIds,
    toggleUserSelection,
    selectAllUsers,
    deselectAllUsers,
    isAllSelected,
    hasSelection,

    // Dialog states
    createDialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    batchDeleteDialogOpen,
    resetPasswordConfirmOpen,
    resetPasswordDialogOpen,

    // Selected user
    selectedUser,

    // Dialog controls
    setCreateDialogOpen,
    setEditDialogOpen,
    setDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    setResetPasswordConfirmOpen,
    setResetPasswordDialogOpen,

    // Form
    formData,
    setFormData,

    // Reset password
    newPassword,
    copied,
    handleCopyPassword,

    // Actions
    openEditDialog,
    openDeleteDialog,
    openResetPasswordConfirm,
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggleActive,
    handleResetPassword,
    handleBatchActivate,
    handleBatchDeactivate,
    handleBatchDelete,
    fetchUsers,
  }
}