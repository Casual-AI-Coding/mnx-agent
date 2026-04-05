import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, Search, Clock, Mail, Pencil, Trash2, Key } from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/shared/Pagination'
import { cn } from '@/lib/utils'
import { status, roles } from '@/themes/tokens/index'
import type { User } from './types'
import { RoleBadge, formatDate, formatFullDate } from './types'

interface UserTableProps {
  users: User[]
  loading: boolean
  error: string | null
  currentPage: number
  pageSize: number
  totalUsers: number
  hasActiveFilters: boolean
  onToggleActive: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onResetPassword: (user: User) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onClearFilters: () => void
}

export function UserTable({
  users,
  loading,
  error,
  currentPage,
  pageSize,
  totalUsers,
  hasActiveFilters,
  onToggleActive,
  onEdit,
  onDelete,
  onResetPassword,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
}: UserTableProps) {
  return (
    <div>
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
                {users.map((user, index) => (
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
                          onCheckedChange={() => onToggleActive(user)}
                          className={cn('data-[state=checked]:', status.success.bg)}
                        />
                        <span className={cn(
                          'text-xs font-medium',
                          user.is_active ? status.success.text : 'text-muted-foreground/60'
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
                          onClick={() => onEdit(user)}
                          className="p-2 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onResetPassword(user)}
                          className={cn(
                            'p-2 rounded-lg text-muted-foreground/60 hover:bg-warning/10 transition-colors',
                            'hover:', roles.pro.text
                          )}
                          title="重置密码"
                        >
                          <Key className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDelete(user)}
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

          {users.length === 0 && (
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
                  onClick={onClearFilters}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  清除筛选条件
                </motion.button>
              )}
            </motion.div>
          )}

          <Pagination
            currentPage={currentPage}
            totalItems={totalUsers}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  )
}