import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Copy,
  Ban,
  Loader2,
  AlertCircle,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import type { InvitationCode, InvitationCodeTableProps } from './types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '永久有效'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / 86400000)

  if (diffDays < 0) return '已过期'
  if (diffDays === 0) return '今天过期'
  if (diffDays === 1) return '明天过期'
  if (diffDays < 7) return `${diffDays}天后过期`

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

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function isUsable(code: InvitationCode): boolean {
  return code.is_active && !isExpired(code.expires_at) && code.used_count < code.max_uses
}

function isFullyUsed(code: InvitationCode): boolean {
  return code.used_count >= code.max_uses
}

export function InvitationCodeTable({
  codes,
  loading,
  error,
  copiedCode,
  onCopy,
  onDeactivate,
}: InvitationCodeTableProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="relative">
          <Loader2 className={cn('w-8 h-8 animate-spin', status.warning.icon)} />
          <div className={cn('absolute inset-0 w-8 h-8 border-2 rounded-full animate-ping', status.warning.border)} />
        </div>
        <p className="text-sm text-muted-foreground/70 mt-3">加载中...</p>
      </motion.div>
    )
  }

  if (error) {
    return (
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
    )
  }

  if (codes.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <Key className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground/60">暂无邀请码</p>
      </div>
    )
  }

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border-b border-border/50">
            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">邀请码</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">创建者</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">使用进度</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">过期时间</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">状态</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">创建时间</th>
            <th className="py-3 px-4 text-center text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          <AnimatePresence mode="popLayout">
            {codes.map((code, index) => {
              const expired = isExpired(code.expires_at)
              const usable = isUsable(code)
              const usagePercent = Math.min(100, (code.used_count / code.max_uses) * 100)

              return (
                <motion.tr
                  key={code.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ backgroundColor: 'rgba(var(--muted), 0.3)' }}
                  className="group"
                >
                  <td className="py-3 px-4 text-foreground">
                    <div className="flex items-center gap-2">
                      <code className={cn(
                        'px-3 py-1.5 rounded-lg font-mono text-sm font-medium border',
                        usable
                          ? cn(status.warning.bg, status.warning.foreground, status.warning.border)
                          : 'bg-muted text-muted-foreground border-border'
                      )}>
                        {code.code}
                      </code>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onCopy(code.code)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          copiedCode === code.code
                            ? cn(status.success.bg, status.success.text)
                            : cn('text-muted-foreground/60', status.warning.text, status.warning.bgSubtle)
                        )}
                        title="复制"
                      >
                        {copiedCode === code.code ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    <span className="text-sm text-foreground">
                      {code.created_by_username || '系统'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${usagePercent}%` }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className={cn(
                            'h-full rounded-full',
                            usagePercent >= 100 ? 'bg-muted-foreground/50' : cn(status.warning.gradient)
                          )}
                        />
                      </div>
                      <span className={cn(
                        'text-xs font-medium',
                        usagePercent >= 100 ? 'text-muted-foreground' : status.warning.text
                      )}>
                        {code.used_count}/{code.max_uses}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock className={cn(
                        'w-3.5 h-3.5',
                        expired ? 'text-destructive' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        expired && 'text-destructive font-medium'
                      )}>
                        {formatDate(code.expires_at)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    {usable ? (
                      <Badge className={cn(status.success.bgSubtle, status.success.text, status.success.border, 'hover:bg-success/20')}>
                        可用
                      </Badge>
                    ) : expired ? (
                      <Badge variant="destructive">已过期</Badge>
                    ) : code.used_count >= code.max_uses ? (
                      <Badge variant="outline" className="text-muted-foreground">已用完</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">已禁用</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    <span className="text-sm text-muted-foreground/70">
                      {formatFullDate(code.created_at)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    <div className="flex items-center justify-center gap-1">
                      {usable && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDeactivate(code.id)}
                          className="p-2 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="禁用"
                        >
                          <Ban className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
