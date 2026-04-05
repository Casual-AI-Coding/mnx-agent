import { useState, useEffect, useMemo } from 'react'
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
  SlidersHorizontal,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { ExportButton } from '@/components/shared/ExportButton'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { status, roles } from '@/themes/tokens'

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

type StatusFilter = 'all' | 'active' | 'used' | 'expired' | 'inactive'
type SortField = 'created_at' | 'expires_at' | 'used_count'
type SortOrder = 'asc' | 'desc'

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

interface FilterChip {
  id: string;
  type: 'search' | 'status';
  label: string;
  value: string;
}

export default function InvitationCodes() {
  const [codes, setCodes] = useState<InvitationCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
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

  const filteredAndSortedCodes = useMemo(() => {
    let result = codes.filter(code => {
      const matchesSearch = code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (code.created_by_username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && isUsable(code)) ||
        (statusFilter === 'used' && isFullyUsed(code)) ||
        (statusFilter === 'expired' && isExpired(code.expires_at)) ||
        (statusFilter === 'inactive' && !code.is_active && !isExpired(code.expires_at) && !isFullyUsed(code))
      
      return matchesSearch && matchesStatus
    })

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'expires_at':
          const aTime = a.expires_at ? new Date(a.expires_at).getTime() : Infinity
          const bTime = b.expires_at ? new Date(b.expires_at).getTime() : Infinity
          comparison = aTime - bTime
          break
        case 'used_count':
          comparison = a.used_count - b.used_count
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [codes, searchQuery, statusFilter, sortField, sortOrder])

  const filterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = []
    if (searchQuery) {
      chips.push({ id: 'search', type: 'search', label: `搜索: "${searchQuery}"`, value: searchQuery })
    }
    if (statusFilter !== 'all') {
      const statusLabels: Record<StatusFilter, string> = {
        all: '全部',
        active: '可用',
        used: '已用完',
        expired: '已过期',
        inactive: '已禁用'
      }
      chips.push({ id: 'status', type: 'status', label: `状态: ${statusLabels[statusFilter]}`, value: statusFilter })
    }
    return chips
  }, [searchQuery, statusFilter])

  const hasActiveFilters = filterChips.length > 0

  const removeFilterChip = (chip: FilterChip) => {
    switch (chip.type) {
      case 'search':
        setSearchQuery('')
        break
      case 'status':
        setStatusFilter('all')
        break
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
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

  const totalCodes = codes.length
  const activeCodes = codes.filter(c => isUsable(c)).length
  const usedCodes = codes.filter(c => isFullyUsed(c)).length
  const expiredCodes = codes.filter(c => isExpired(c.expires_at)).length

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      toast.error('复制失败')
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
        toast.error(data.error || '生成邀请码失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
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
        toast.error(data.error || '操作失败')
      }
    } catch {
      toast.error('网络错误')
    }
  }

  const SortButton = ({ field, currentField, order, onClick, children }: {
    field: SortField
    currentField: SortField
    order: SortOrder
    onClick: () => void
    children: React.ReactNode
  }) => {
    const isActive = currentField === field
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          'px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
          isActive
            ? cn(status.warning.bg, status.warning.text, status.warning.border)
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
        )}
      >
        {children}
        {isActive && (
          order === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        )}
      </motion.button>
    )
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
            <div className={cn('p-2 rounded-xl bg-gradient-to-br border', status.warning.iconBg, status.warning.border)}>
              <Key className={cn('w-6 h-6', status.warning.icon)} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              邀请码管理
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/70">生成和管理注册邀请码</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredAndSortedCodes}
            filename="invitation_codes"
            disabled={filteredAndSortedCodes.length === 0}
          />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setGenerateDialogOpen(true)}
              className={cn('bg-gradient-to-r shadow-lg', status.warning.bg, status.warning.hover, status.warning.shadow)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              批量生成
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <StatCard title="总邀请码" value={totalCodes} icon={Key} color={status.warning.gradient} />
        <StatCard title="可用" value={activeCodes} icon={CheckCircle2} color={status.success.gradient} />
        <StatCard title="已用完" value={usedCodes} icon={Users} color={status.info.gradient} />
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
          <div className="bg-gradient-to-r from-card via-card to-muted/20">
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-[280px] group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={cn('h-4 w-4 text-muted-foreground/60 group-focus-within:text-amber-500 transition-colors', status.warning.icon)} />
                  </div>
                  <Input
                    placeholder="搜索邀请码或创建者..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={cn('pl-10 pr-10 h-10 bg-background/50 border-border/50 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all', status.warning.focusRing, status.warning.focusBorder)}
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

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[120px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/70 text-sm">状态</span>
                      <span className={cn(
                        'text-sm font-medium',
                        statusFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60'
                      )}>
                        {statusFilter === 'all' ? '全部' :
                         statusFilter === 'active' ? '可用' :
                         statusFilter === 'used' ? '已用完' :
                         statusFilter === 'expired' ? '已过期' : '已禁用'}
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
                        <div className={cn('w-2 h-2 rounded-full', status.success.bg)} />
                        可用
                      </div>
                    </SelectItem>
                    <SelectItem value="used">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', status.info.bg)} />
                        已用完
                      </div>
                    </SelectItem>
                    <SelectItem value="expired">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        已过期
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
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
                              chip.type === 'search' && cn(status.warning.bg, status.warning.text, status.warning.border),
                              chip.type === 'status' && statusFilter === 'active' && cn(status.success.bg, status.success.text, status.success.border),
                              chip.type === 'status' && statusFilter === 'used' && cn(status.info.bg, status.info.text, status.info.border),
                              chip.type === 'status' && statusFilter === 'expired' && 'bg-slate-500/10 text-slate-600 border-slate-500/20',
                              chip.type === 'status' && statusFilter === 'inactive' && 'bg-destructive/10 text-destructive border-destructive/20'
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
                      <RefreshCw className="w-3 h-3" />
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
                  <SortButton field="expires_at" currentField={sortField} order={sortOrder} onClick={() => toggleSort('expires_at')}>
                    过期
                  </SortButton>
                  <SortButton field="used_count" currentField={sortField} order={sortOrder} onClick={() => toggleSort('used_count')}>
                    次数
                  </SortButton>
                </div>

                <div className="h-8 w-px bg-border/60 hidden lg:block" />

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground/70">结果</span>
                  <span className="font-semibold text-foreground">{filteredAndSortedCodes.length}</span>
                  <span className="text-muted-foreground/50">/ {codes.length}</span>
                </div>
              </div>
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
                  <Loader2 className={cn('w-8 h-8 animate-spin', status.warning.icon)} />
                  <div className={cn('absolute inset-0 w-8 h-8 border-2 rounded-full animate-ping', status.warning.border)} />
                </div>
                <p className="text-sm text-muted-foreground/70 mt-3">加载中...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {}
          {!loading && !error && (
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
                    {filteredAndSortedCodes.map((code, index) => {
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
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className={cn(
                                'px-3 py-1.5 rounded-lg font-mono text-sm font-medium border',
                                usable
                                  ? cn(status.warning.bg, status.warning.text, status.warning.border)
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
                                    ? cn(status.success.bg, status.success.icon)
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
                                    usagePercent >= 100 ? 'bg-slate-400' : cn(status.warning.gradient)
                                  )}
                                />
                              </div>
                              <span className={cn(
                                'text-xs font-medium',
                                usagePercent >= 100 ? 'text-slate-400' : status.warning.text
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
                              <Badge className={cn(status.success.bg, status.success.text, status.success.border, status.success.hover)}>
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

              {filteredAndSortedCodes.length === 0 && (
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

import { ChevronDown, ChevronUp } from 'lucide-react'

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
