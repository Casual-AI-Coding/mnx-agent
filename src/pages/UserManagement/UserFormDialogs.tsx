import { Loader2, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { User, UserRole } from './types'

interface FormData {
  username: string
  password: string
  email: string
  role: UserRole
  minimax_api_key: string
}

interface UserFormDialogsProps {
  createDialogOpen: boolean
  editDialogOpen: boolean
  deleteDialogOpen: boolean
  batchDeleteDialogOpen: boolean
  resetPasswordConfirmOpen: boolean
  resetPasswordDialogOpen: boolean
  selectedUser: User | null
  formData: FormData
  actionLoading: boolean
  newPassword: string
  copied: boolean
  selectedUserIds: Set<string>
  onCloseCreate: () => void
  onCloseEdit: () => void
  onCloseDelete: () => void
  onCloseBatchDelete: () => void
  onCloseResetPasswordConfirm: () => void
  onCloseResetPassword: () => void
  onFormChange: (data: FormData | ((prev: FormData) => FormData)) => void
  onCreate: () => void
  onEdit: () => void
  onDelete: () => void
  onBatchDelete: () => void
  onResetPassword: () => void
  onCopyPassword: () => Promise<void>
}

export function UserFormDialogs({
  createDialogOpen,
  editDialogOpen,
  deleteDialogOpen,
  batchDeleteDialogOpen,
  resetPasswordConfirmOpen,
  resetPasswordDialogOpen,
  selectedUser,
  formData,
  actionLoading,
  newPassword,
  copied,
  selectedUserIds,
  onCloseCreate,
  onCloseEdit,
  onCloseDelete,
  onCloseBatchDelete,
  onCloseResetPasswordConfirm,
  onCloseResetPassword,
  onFormChange,
  onCreate,
  onEdit,
  onDelete,
  onBatchDelete,
  onResetPassword,
  onCopyPassword,
}: UserFormDialogsProps) {
  return (
    <>
      <Dialog open={createDialogOpen} onClose={onCloseCreate} title="新建用户">
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">用户名 *</label>
            <Input
              value={formData.username}
              onChange={e => onFormChange(prev => ({ ...prev, username: e.target.value }))}
              placeholder="输入用户名"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">密码 *</label>
            <Input
              type="password"
              value={formData.password}
              onChange={e => onFormChange(prev => ({ ...prev, password: e.target.value }))}
              placeholder="输入密码"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">邮箱</label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => onFormChange(prev => ({ ...prev, email: e.target.value }))}
              placeholder="选填"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">角色</label>
            <Select value={formData.role} onValueChange={v => onFormChange(prev => ({ ...prev, role: v as UserRole }))}>
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
              onChange={e => onFormChange(prev => ({ ...prev, minimax_api_key: e.target.value }))}
              placeholder="选填"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCloseCreate}>取消</Button>
          <Button onClick={onCreate} disabled={actionLoading || !formData.username || !formData.password}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={onCloseEdit} title="编辑用户">
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
              onChange={e => onFormChange(prev => ({ ...prev, email: e.target.value }))}
              placeholder="选填"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">角色</label>
            <Select value={formData.role} onValueChange={v => onFormChange(prev => ({ ...prev, role: v as UserRole }))}>
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
              onChange={e => onFormChange(prev => ({ ...prev, minimax_api_key: e.target.value }))}
              placeholder="选填"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCloseEdit}>取消</Button>
          <Button onClick={onEdit} disabled={actionLoading}>
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={onCloseDelete}
        onConfirm={onDelete}
        title="删除用户"
        description={`确定要删除用户 ${selectedUser?.username} 吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        requireInput={selectedUser?.username}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={resetPasswordConfirmOpen}
        onClose={onCloseResetPasswordConfirm}
        onConfirm={onResetPassword}
        title="重置密码"
        description={`确定要重置用户 ${selectedUser?.username} 的密码吗？重置后将生成新密码。`}
        confirmText="确认重置"
        cancelText="取消"
        variant="default"
        loading={actionLoading}
      />

      <Dialog open={resetPasswordDialogOpen} onClose={onCloseResetPassword} title="密码重置成功">
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">新密码已生成</span>
          </div>
          <p className="text-sm text-muted-foreground">
            请复制下方新密码并转告用户。出于安全考虑，此密码仅显示一次。
          </p>
          <div className="relative">
            <Input
              id="new-password-field"
              value={newPassword}
              readOnly
              className="pr-24 font-mono text-sm bg-muted"
            />
            <Button
              size="sm"
              onClick={onCopyPassword}
              className="absolute right-1 top-1/2 -translate-y-1/2"
              variant={copied ? "default" : "outline"}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </>
              )}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onCloseResetPassword}>
            完成
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={batchDeleteDialogOpen}
        onClose={onCloseBatchDelete}
        onConfirm={onBatchDelete}
        title="批量删除用户"
        description={`确定要删除选中的 ${selectedUserIds.size} 个用户吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        loading={actionLoading}
      />
    </>
  )
}