import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Sparkles,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { ExportButton } from '@/components/shared/ExportButton'
import { PageHeader } from '@/components/shared/PageHeader'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { InvitationCodeTable } from './InvitationCodeTable'
import { InvitationCodeModal } from './InvitationCodeModal'
import type {
  InvitationCode,
  StatusFilter,
  SortField,
  SortOrder,
  FilterChip,
  GenerateFormData,
} from './types'

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

function StatCard({ title, value, icon: Icon, color, compact = false }: {
  title: string
  value: number
  icon: React.ElementType
  color: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ type: 'spring', stiffness: 400 }}
        className="relative overflow-hidden rounded-lg border border-border/50 shadow-sm"
      >
        <div className={cn('absolute inset-0 opacity-15 bg-gradient-to-br', color)} />
        <div className="relative flex items-center gap-2.5 px-3 py-2">
          <div className={cn('p-1.5 rounded-md bg-gradient-to-br shadow-sm', color)}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-base font-bold text-foreground">{value}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400 }}>
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4">
        <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', color)} />
        <div className="relative flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-gradient-to-br shadow-lg', color)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SortButton({
  field,
  currentField,
  order,
  onClick,
  children,
}: {
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
        'px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
        isActive
          ? cn(status.warning.bg, status.warning.foreground, status.warning.border)
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

  const handleGenerate = async (formData: GenerateFormData) => {
    setActionLoading(true)
    try {
      const data = await apiClient.post<{ success: boolean; error?: string }>('/invitation-codes/batch', {
        count: formData.count,
        max_uses: formData.max_uses,
        expires_at: formData.expires_at || null,
      })
      if (data.success) {
        setGenerateDialogOpen(false)
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Key className="w-5 h-5" />}
        title="邀请码管理"
        description="生成和管理注册邀请码"
        gradient="orange-amber"
        actions={
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-4 gap-2">
              <StatCard
                title="总邀请码"
                value={totalCodes}
                icon={Key}
                color={status.warning.gradient}
                compact
              />
              <StatCard
                title="可用"
                value={activeCodes}
                icon={CheckCircle2}
                color={status.success.gradient}
                compact
              />
              <StatCard
                title="已用完"
                value={usedCodes}
                icon={Users}
                color={status.info.gradient}
                compact
              />
              <StatCard
                title="已过期"
                value={expiredCodes}
                icon={XCircle}
                color="from-muted to-muted-foreground/70"
                compact
              />
            </div>
            <ExportButton
              data={filteredAndSortedCodes}
              filename="invitation_codes"
              disabled={filteredAndSortedCodes.length === 0}
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setGenerateDialogOpen(true)}
                className={cn('bg-gradient-to-r shadow-lg shadow-warning/20', status.warning.bg, status.warning.foreground, 'hover:opacity-90')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                批量生成
              </Button>
            </motion.div>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/5">
          <div className="bg-gradient-to-r from-card via-card to-muted/20">
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-[280px] group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={cn('h-4 w-4 text-muted-foreground/60 transition-colors', status.warning.text)} />
                  </div>
                  <Input
                    placeholder="搜索邀请码或创建者..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-background/50 border-border/50 focus:border-warning/50 focus:ring-2 focus:ring-warning/10 transition-all"
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
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
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
                              chip.type === 'search' && cn(status.warning.bg, status.warning.foreground, status.warning.border),
                              chip.type === 'status' && statusFilter === 'active' && cn(status.success.bg, status.success.foreground, status.success.border),
                              chip.type === 'status' && statusFilter === 'used' && cn(status.info.bg, status.info.foreground, status.info.border),
                              chip.type === 'status' && statusFilter === 'expired' && 'bg-muted/50 text-muted-foreground border-muted-foreground/20',
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
                  <SortButton
                    field="created_at"
                    currentField={sortField}
                    order={sortOrder}
                    onClick={() => toggleSort('created_at')}
                  >
                    创建
                  </SortButton>
                  <SortButton
                    field="expires_at"
                    currentField={sortField}
                    order={sortOrder}
                    onClick={() => toggleSort('expires_at')}
                  >
                    过期
                  </SortButton>
                  <SortButton
                    field="used_count"
                    currentField={sortField}
                    order={sortOrder}
                    onClick={() => toggleSort('used_count')}
                  >
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

          <InvitationCodeTable
            codes={filteredAndSortedCodes}
            loading={loading}
            error={error}
            copiedCode={copiedCode}
            onCopy={handleCopy}
            onDeactivate={handleDeactivate}
          />
        </Card>
      </motion.div>

      <InvitationCodeModal
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        onGenerate={handleGenerate}
        loading={actionLoading}
      />
    </div>
  )
}
