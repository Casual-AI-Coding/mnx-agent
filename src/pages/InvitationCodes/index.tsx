import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Key, Sparkles, CheckCircle2, Users, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ExportButton } from '@/components/shared/ExportButton'
import { PageHeader } from '@/components/shared/PageHeader'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { InvitationCodeTable } from './InvitationCodeTable'
import { InvitationCodeModal } from './InvitationCodeModal'
import { StatCard } from '../invitation-codes/StatCard'
import { FilterBar } from '../invitation-codes/FilterBar'
import { useAuthStore } from '@/stores/auth'
import type { InvitationCode, StatusFilter, SortField, SortOrder, FilterChip, GenerateFormData } from './types'

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

export default function InvitationCodes() {
  const { isHydrated } = useAuthStore()
  const hasInitializedRef = useRef(false)
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
    if (!isHydrated || hasInitializedRef.current) return
    hasInitializedRef.current = true
    fetchCodes()
  }, [isHydrated])

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
        all: '全部', active: '可用', used: '已用完', expired: '已过期', inactive: '已禁用'
      }
      chips.push({ id: 'status', type: 'status', label: `状态: ${statusLabels[statusFilter]}`, value: statusFilter })
    }
    return chips
  }, [searchQuery, statusFilter])

  const removeFilterChip = (chip: FilterChip) => {
    switch (chip.type) {
      case 'search': setSearchQuery(''); break
      case 'status': setStatusFilter('all'); break
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
              <StatCard title="总邀请码" value={totalCodes} icon={Key} color={status.warning.gradient} compact />
              <StatCard title="可用" value={activeCodes} icon={CheckCircle2} color={status.success.gradient} compact />
              <StatCard title="已用完" value={usedCodes} icon={Users} color={status.info.gradient} compact />
              <StatCard title="已过期" value={expiredCodes} icon={XCircle} color="from-muted to-muted-foreground/70" compact />
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/5">
          <FilterBar
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortField={sortField}
            sortOrder={sortOrder}
            filterChips={filterChips}
            codesCount={filteredAndSortedCodes.length}
            totalCount={codes.length}
            onSearchChange={setSearchQuery}
            onStatusChange={(v) => setStatusFilter(v as StatusFilter)}
            onToggleSort={toggleSort}
            onRemoveFilterChip={removeFilterChip}
            onClearFilters={clearAllFilters}
          />

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
