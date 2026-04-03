import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Plus,
  Copy,
  Ban,
  Search,
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface InvitationCode {
  id: string
  code: string
  created_by: string
  created_by_username: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

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

export default function InvitationCodes() {
  const [codes, setCodes] = useState<InvitationCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [generateForm, setGenerateForm] = useState({
    count: 10,
    max_uses: 1,
    expires_at: '',
  })

  const fetchCodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<{ success: boolean; data: InvitationCode[]; error?: string }>('/invitation-codes')
      if (data.success) {
        setCodes(data.data)
      } else {
        setError(data.error || '获取邀请码列表失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCodes()
  }, [])

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (code.created_by_username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const totalCodes = codes.length
  const activeCodes = codes.filter(c => c.is_active && !isExpired(c.expires_at) && c.used_count < c.max_uses).length
  const usedCodes = codes.filter(c => c.used_count >= c.max_uses).length
  const expiredCodes = codes.filter(c => isExpired(c.expires_at)).length

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      alert('复制失败')
    }
  }

  const handleGenerate = async () => {
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; error?: string }>('/invitation-codes/batch', {
        count: generateForm.count,
        max_uses: generateForm.max_uses,
        expires_at: generateForm.expires_at || null,
      })
      if (data.success) {
        setGenerateDialogOpen(false)
        setGenerateForm({ count: 10, max_uses: 1, expires_at: '' })
        fetchCodes()
      } else {
        alert(data.error || '生成邀请码失败')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const data = await apiClient.delete<{ success: boolean; error?: string }>(`/invitation-codes/${id}`)
      if (data.success) {
        fetchCodes()
      } else {
        alert(data.error || '操作失败')
      }
    } catch {
      alert('网络错误')
    }
  }

  return (
    <div className="space-y-6">
      {}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
              <Key className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              邀请码管理
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/70">生成和管理注册邀请码</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setGenerateDialogOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-500/90 hover:to-amber-600/90 shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            批量生成
          </Button>
        </motion.div>
      </motion.div>

      {}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <StatCard title="总邀请码" value={totalCodes} icon={Key} color="from-amber-500 to-amber-400" />
        <StatCard title="可用" value={activeCodes} icon={CheckCircle2} color="from-emerald-500 to-emerald-400" />
        <StatCard title="已用完" value={usedCodes} icon={Users} color="from-blue-500 to-blue-400" />
        <StatCard title="已过期" value={expiredCodes} icon={XCircle} color="from-slate-500 to-slate-400" />
      </motion.div>

      {}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/5">
          {}
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索邀请码或创建者..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-card/50 border-border/50 focus:border-amber-500/50"
              />
            </div>
          </div>

          {}
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

          {}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="relative">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <div className="absolute inset-0 w-8 h-8 border-2 border-amber-500/20 rounded-full animate-ping" />
                </div>
                <p className="text-sm text-muted-foreground/70 mt-3">加载中...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {}
          {!loading && !error && (
            <div className="overflow-x-auto">
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
                  <AnimatePresence>
                    {filteredCodes.map((code, index) => {
                      const expired = isExpired(code.expires_at)
                      const usable = code.is_active && !expired && code.used_count < code.max_uses
                      const usagePercent = Math.min(100, (code.used_count / code.max_uses) * 100)
                      
                      return (
                        <motion.tr
                          key={code.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.03 }}
                          whileHover={{ backgroundColor: 'rgba(var(--muted), 0.3)' }}
                          className="group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className={cn(
                                'px-3 py-1.5 rounded-lg font-mono text-sm font-medium border',
                                usable
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                  : 'bg-muted text-muted-foreground border-border'
                              )}>
                                {code.code}
                              </code>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCopy(code.code)}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  copiedCode === code.code
                                    ? 'text-emerald-500 bg-emerald-500/10'
                                    : 'text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/10'
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
                          <td className="py-3 px-4">
                            <span className="text-sm text-foreground">
                              {code.created_by_username || '系统'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${usagePercent}%` }}
                                  transition={{ duration: 0.5, delay: index * 0.05 }}
                                  className={cn(
                                    'h-full rounded-full',
                                    usagePercent >= 100 ? 'bg-slate-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                                  )}
                                />
                              </div>
                              <span className={cn(
                                'text-xs font-medium',
                                usagePercent >= 100 ? 'text-slate-400' : 'text-amber-600'
                              )}>
                                {code.used_count}/{code.max_uses}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
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
                          <td className="py-3 px-4">
                            {usable ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                                可用
                              </Badge>
                            ) : expired ? (
                              <Badge variant="destructive">已过期</Badge>
                            ) : code.used_count >= code.max_uses ? (
                              <Badge variant="outline" className="text-slate-400">已用完</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">已禁用</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground/70">
                              {formatFullDate(code.created_at)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {usable && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleDeactivate(code.id)}
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

              {filteredCodes.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <Key className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground/60">暂无邀请码</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} title="批量生成邀请码">
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">生成数量 *</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={generateForm.count}
              onChange={e => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-muted-foreground mt-1">1-100 个</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">最大使用次数 *</label>
            <Input
              type="number"
              min={1}
              value={generateForm.max_uses}
              onChange={e => setGenerateForm({ ...generateForm, max_uses: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">过期时间</label>
            <Input
              type="datetime-local"
              value={generateForm.expires_at}
              onChange={e => setGenerateForm({ ...generateForm, expires_at: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">不填则永久有效</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>取消</Button>
          <Button onClick={handleGenerate} disabled={actionLoading} className="bg-amber-500 hover:bg-amber-600">
            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Sparkles className="w-4 h-4 mr-2" />
            生成
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
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
      <Card className="relative overflow-hidden border-border/50">
        <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', color)} />
        <CardContent className="relative p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-gradient-to-br shadow-lg', color)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{title}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
