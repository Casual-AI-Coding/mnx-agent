import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Shield,
  User as UserIcon,
  Crown,
  Star,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Switch } from '@/components/ui/Switch'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type UserRole = 'super' | 'admin' | 'pro' | 'user'

interface User {
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

type SortField = 'username' | 'role' | 'created_at' | 'last_login_at'
type SortOrder = 'asc' | 'desc'

const ROLE_CONFIG: Record<UserRole, { 
  label: string; 
  icon: React.ReactNode; 
  gradient: string;
  bgClass: string;
  color: string;
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

function formatDate(dateStr: string | null): string {
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

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RoleBadge({ role }: { role: UserRole }) {
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

interface FilterChip {
  id: string;
  type: 'search' | 'role' | 'status';
  label: string;
  value: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user' as UserRole,
    minimax_api_key: '',
  })

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<{ success: boolean; data: User[]; error?: string }>('/users')
      if (data.success) {
        setUsers(data.data)
      } else {
        setError(data.error || '获取用户列表失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const activeUsers = users.filter(u => u.is_active).length
  const inactiveUsers = users.filter(u => !u.is_active).length

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

  const filterChips: FilterChip[] = useMemo(() => {
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

  const removeFilterChip = (chip: FilterChip) => {
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
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setRoleFilter('all')
    setStatusFilter('all')
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleCreate = async () => {
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
        alert(data.error || '创建用户失败')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = async () => {
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
        alert(data.error || '更新用户失败')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const data = await apiClient.patch<{ success: boolean; error?: string }>(`/users/${user.id}`, {
        is_active: !user.is_active,
      })
      if (data.success) {
        fetchUsers()
      } else {
        alert(data.error || '操作失败')
      }
    } catch {
      alert('网络错误')
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const data = await apiClient.delete<{ success: boolean; error?: string }>(`/users/${selectedUser.id}`)
      if (data.success) {
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        alert(data.error || '删除用户失败')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      role: user.role,
      minimax_api_key: user.minimax_api_key || '',
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              用户管理
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/70">管理系统用户、角色和访问权限</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建用户
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatCard title="总用户" value={users.length} icon={Users} color="from-primary to-primary/60" />
        <StatCard title="已启用" value={activeUsers} icon={CheckCircle2} color="from-emerald-500 to-emerald-400" />
        <StatCard title="已禁用" value={inactiveUsers} icon={XCircle} color="from-slate-500 to-slate-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="overflow-hidden border border-border/50 shadow-xl shadow-black/5">
          <div className="bg-gradient-to-r from-card via-card to-muted/20">
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-[280px] group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    placeholder="搜索用户名或邮箱..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>

                <div className="h-8 w-px bg-border/60 hidden sm:block" />

                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground/70" />
                  <span className="text-sm text-muted-foreground/70 hidden sm:inline">筛选</span>
                </div>

                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | 'all')}>
                  <SelectTrigger className="w-[110px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/70 text-sm">角色</span>
                      <span className={cn(
                        'text-sm font-medium',
                        roleFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60'
                      )}>
                        {roleFilter === 'all' ? '全部' : ROLE_CONFIG[roleFilter].label}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        全部角色
                      </div>
                    </SelectItem>
                    {(['super', 'admin', 'pro', 'user'] as UserRole[]).map(role => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', ROLE_CONFIG[role].color.replace('text-', 'bg-'))} />
                          {ROLE_CONFIG[role].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
                  <SelectTrigger className="w-[110px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/70 text-sm">状态</span>
                      <span className={cn(
                        'text-sm font-medium',
                        statusFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60'
                      )}>
                        {statusFilter === 'all' ? '全部' : statusFilter === 'active' ? '已启用' : '已禁用'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        全部状态
                      </div>
                    </SelectItem>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        已启用
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        已禁用
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                {hasActiveFilters && (
                  <>
                    <div className="h-8 w-px bg-border/60" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <AnimatePresence mode="popLayout">
                        {filterChips.map((chip, index) => (
                          <motion.div
                            key={chip.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15, delay: index * 0.03 }}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity',
                              chip.type === 'search' && 'bg-primary/10 text-primary border-primary/20',
                              chip.type === 'role' && roleFilter !== 'all' && ROLE_CONFIG[roleFilter].bgClass,
                              chip.type === 'status' && (statusFilter === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                              )
                            )}
                            onClick={() => removeFilterChip(chip)}
                          >
                            {chip.label}
                            <X className="w-3 h-3" />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-destructive transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      清除
                    </motion.button>
                  </>
                )}

                <div className="h-8 w-px bg-border/60 hidden md:block" />

                <ArrowUpDown className="w-4 h-4 text-muted-foreground/60" />
                <div className="flex items-center gap-1">
                  <SortButton field="created_at" currentField={sortField} order={sortOrder} onClick={() => toggleSort('created_at')}>
                    创建
                  </SortButton>
                  <SortButton field="last_login_at" currentField={sortField} order={sortOrder} onClick={() => toggleSort('last_login_at')}>
                    登录
                  </SortButton>
                  <SortButton field="username" currentField={sortField} order={sortOrder} onClick={() => toggleSort('username')}>
                    名称
                  </SortButton>
                </div>

                <div className="h-8 w-px bg-border/60 hidden lg:block" />

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground/70">结果</span>
                  <span className="font-semibold text-foreground">{filteredAndSortedUsers.length}</span>
                  <span className="text-muted-foreground/50">/ {users.length}</span>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-destructive/10 border-b border-destructive/20"
              >
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="relative">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div className="absolute inset-0 w-8 h-8 border-2 border-primary/20 rounded-full animate-ping" />
                </div>
                <p className="text-sm text-muted-foreground/70 mt-3">加载中...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && !error && (
            <div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border-b border-border/50">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">用户</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">角色</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">状态</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">区域</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">最后登录</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">创建时间</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.03,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        className="group hover:bg-muted/30"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold',
                              user.is_active
                                ? 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}>
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.username}</p>
                              {user.email && (
                                <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={() => handleToggleActive(user)}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                            <span className={cn(
                              'text-xs font-medium',
                              user.is_active ? 'text-emerald-600' : 'text-muted-foreground/60'
                            )}>
                              {user.is_active ? '启用' : '禁用'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {user.minimax_region === 'cn' ? 'CN' : 'INT'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span className={cn(!user.last_login_at && 'text-muted-foreground/40')}>
                              {formatDate(user.last_login_at)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground/70">
                            {formatFullDate(user.created_at)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openEditDialog(user)}
                              className="p-2 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                              title="编辑"
                            >
                              <Pencil className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openDeleteDialog(user)}
                              className="p-2 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredAndSortedUsers.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-12 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground/60 mb-2">未找到匹配的用户</p>
                  {hasActiveFilters && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearAllFilters}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      清除筛选条件
                    </motion.button>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} title="新建用户">
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">用户名 *</label>
            <Input
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              placeholder="输入用户名"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">密码 *</label>
            <Input
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="输入密码"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">邮箱</label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="选填"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">角色</label>
            <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v as UserRole })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super">Super</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">MiniMax API Key</label>
            <Input
              value={formData.minimax_api_key}
              onChange={e => setFormData({ ...formData, minimax_api_key: e.target.value })}
              placeholder="选填"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={actionLoading || !formData.username || !formData.password}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="编辑用户">
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">用户名</label>
            <Input value={formData.username} disabled className="bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">邮箱</label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="选填"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">角色</label>
            <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v as UserRole })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super">Super</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">MiniMax API Key</label>
            <Input
              value={formData.minimax_api_key}
              onChange={e => setFormData({ ...formData, minimax_api_key: e.target.value })}
              placeholder="选填"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleEdit} disabled={actionLoading}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} title="删除用户">
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            确定要删除用户 <span className="font-semibold text-foreground">{selectedUser?.username}</span> 吗？此操作不可恢复。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            删除
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function SortButton({ field, currentField, order, onClick, children }: {
  field: SortField
  currentField: SortField
  order: SortOrder
  onClick: () => void
  children: React.ReactNode
}) {
  const isActive = currentField === field
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive 
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {children}
      {isActive && (
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: order === 'asc' ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </motion.div>
      )}
    </motion.button>
  )
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400 }}>
      <Card className="relative overflow-hidden border border-border/50">
        <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', color)} />
        <CardContent className="relative p-5">
          <div className="flex items-center gap-4">
            <div className={cn('p-2.5 rounded-xl bg-gradient-to-br shadow-lg', color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
