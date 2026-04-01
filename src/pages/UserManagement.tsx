import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { apiClient } from '@/lib/api/client'

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

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  super: { label: 'Super', icon: <Crown className="w-3 h-3" />, variant: 'destructive' },
  admin: { label: 'Admin', icon: <Shield className="w-3 h-3" />, variant: 'default' },
  pro: { label: 'Pro', icon: <Star className="w-3 h-3" />, variant: 'secondary' },
  user: { label: 'User', icon: <UserIcon className="w-3 h-3" />, variant: 'outline' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '从未'
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
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'default' : 'outline'}>
      {isActive ? '启用' : '禁用'}
    </Badge>
  )
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            用户管理
          </CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建用户
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名或邮箱..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium">用户名</th>
                    <th className="py-3 px-4 text-left font-medium">邮箱</th>
                    <th className="py-3 px-4 text-left font-medium">角色</th>
                    <th className="py-3 px-4 text-left font-medium">状态</th>
                    <th className="py-3 px-4 text-left font-medium">区域</th>
                    <th className="py-3 px-4 text-left font-medium">最后登录</th>
                    <th className="py-3 px-4 text-left font-medium">创建时间</th>
                    <th className="py-3 px-4 text-left font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{user.username}</td>
                      <td className="py-3 px-4">{user.email || '-'}</td>
                      <td className="py-3 px-4"><RoleBadge role={user.role} /></td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleToggleActive(user)} className="cursor-pointer">
                          <StatusBadge isActive={user.is_active} />
                        </button>
                      </td>
                      <td className="py-3 px-4">{user.minimax_region === 'cn' ? '国内' : '国际'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(user.last_login_at)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(user.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(user)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">暂无用户数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} title="新建用户">
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">用户名 *</label>
            <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="输入用户名" />
          </div>
          <div>
            <label className="text-sm font-medium">密码 *</label>
            <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="输入密码（至少6位）" />
          </div>
          <div>
            <label className="text-sm font-medium">邮箱</label>
            <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="输入邮箱（可选）" />
          </div>
          <div>
            <label className="text-sm font-medium">角色</label>
            <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v as UserRole })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super">Super</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">MiniMax API Key</label>
            <Input value={formData.minimax_api_key} onChange={e => setFormData({ ...formData, minimax_api_key: e.target.value })} placeholder="输入 API Key（可选）" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={actionLoading || !formData.username || !formData.password}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}创建
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="编辑用户">
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">用户名</label>
            <Input value={formData.username} disabled />
          </div>
          <div>
            <label className="text-sm font-medium">邮箱</label>
            <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="输入邮箱（可选）" />
          </div>
          <div>
            <label className="text-sm font-medium">角色</label>
            <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v as UserRole })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super">Super</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">MiniMax API Key</label>
            <Input value={formData.minimax_api_key} onChange={e => setFormData({ ...formData, minimax_api_key: e.target.value })} placeholder="输入 API Key（可选）" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleEdit} disabled={actionLoading}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}保存
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} title="确认删除">
        <p className="py-4">确定要删除用户 <strong>{selectedUser?.username}</strong> 吗？此操作不可恢复。</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}删除
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}