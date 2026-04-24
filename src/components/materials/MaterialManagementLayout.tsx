import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Music, Loader2, Pencil, Plus, Search, Trash2, X, Calendar, Mic2, Layers, ArrowRight, ChevronUp, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { Pagination } from '@/components/shared/Pagination'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/Select'
import { useMaterialsStore } from '@/stores/materials'
import type { SortField } from '@/stores/materials'
import { useAuthStore } from '@/stores/auth'
import { toastSuccess, toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { CreateMaterial, MaterialType } from '@/types/material'
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPE_COLORS } from '@/types/material'

function SortButton({ field, currentField, order, onClick, children }: {
  field: SortField
  currentField: SortField
  order: 'asc' | 'desc'
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

export function MaterialManagementLayout() {
  const {
    materials, isLoading, error, fetchMaterials, addMaterial, removeMaterial, clearError,
    total, page, limit,
    typeFilter, sortField, sortOrder,
    setPage, setLimit, setTypeFilter, toggleSort,
  } = useMaterialsStore()
  const { isHydrated } = useAuthStore()
  const navigate = useNavigate()
  const hasInitializedRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newMaterialName, setNewMaterialName] = useState('')
  const [newMaterialDescription, setNewMaterialDescription] = useState('')
  const [newMaterialType, setNewMaterialType] = useState<MaterialType>('artist')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!isHydrated || hasInitializedRef.current) return
    hasInitializedRef.current = true
    fetchMaterials()
  }, [isHydrated, fetchMaterials])

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const isSearching = searchQuery.trim().length > 0

  const handleCreate = async () => {
    if (!newMaterialName.trim()) {
      toastError('请输入素材名称')
      return
    }
    setIsCreating(true)
    const data: CreateMaterial = {
      material_type: newMaterialType,
      name: newMaterialName.trim(),
      description: newMaterialDescription.trim() || undefined,
    }
    const success = await addMaterial(data)
    setIsCreating(false)
    if (success) {
      toastSuccess('创建成功', `素材 "${newMaterialName}" 已创建`)
      setNewMaterialName('')
      setNewMaterialDescription('')
      setNewMaterialType('artist')
      setIsCreateDialogOpen(false)
    } else {
      toastError('创建失败', '请稍后重试')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    const success = await removeMaterial(deleteConfirm.id)
    if (success) {
      toastSuccess('删除成功', `素材 "${deleteConfirm.name}" 已删除`)
    } else {
      toastError('删除失败', '请稍后重试')
    }
    setDeleteConfirm(null)
  }

  const openDeleteConfirm = (id: string, name: string) => {
    setDeleteConfirm({ id, name })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Music className="w-5 h-5" />}
        title="素材管理"
        description="管理素材、条目和提示词"
        gradient="green-emerald"
        actions={
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-3 gap-2">
              <motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 400 }} className="relative overflow-hidden rounded-lg border border-border/50 shadow-sm">
                <div className="absolute inset-0 opacity-15 bg-gradient-to-br from-emerald-500 to-emerald-600" />
                <div className="relative flex items-center gap-2.5 px-3 py-2">
                  <div className="p-1.5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
                          <Mic2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">总素材数</p>
                    <p className="text-base font-bold text-foreground">{total}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 400 }} className="relative overflow-hidden rounded-lg border border-border/50 shadow-sm">
                <div className="absolute inset-0 opacity-15 bg-gradient-to-br from-primary to-primary/60" />
                <div className="relative flex items-center gap-2.5 px-3 py-2">
                  <div className="p-1.5 rounded-md bg-gradient-to-br from-primary to-primary/60 shadow-sm">
                    <Search className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">当前视图</p>
                    <p className="text-sm font-semibold text-foreground">
                      {isSearching ? '搜索结果' : typeFilter === 'all' ? '全部素材' : MATERIAL_TYPE_LABELS[typeFilter]}
                    </p>
                  </div>
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 400 }} className="relative overflow-hidden rounded-lg border border-border/50 shadow-sm">
                <div className="absolute inset-0 opacity-15 bg-gradient-to-br from-orange-500 to-orange-600" />
                <div className="relative flex items-center gap-2.5 px-3 py-2">
                  <div className="p-1.5 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
                          <Layers className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">可继续动作</p>
                    <p className="text-xs font-semibold text-foreground/80">创建 / 编辑 / 清理</p>
                  </div>
                </div>
              </motion.div>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-1.5 rounded-lg border border-primary/20 bg-primary px-5 shadow-md shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              创建素材
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <span>{error}</span>
          <button onClick={clearError} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border border-border/50 shadow-xl shadow-black/5">
          <div className="bg-gradient-to-r from-card via-card to-muted/20">
            <CardContent className="pt-4">
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-[280px] group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      placeholder="搜索素材..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as MaterialType | 'all')}>
                <SelectTrigger className="w-[110px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/70 text-sm">类型</span>
                    <span className={cn(
                      'text-sm font-medium',
                      typeFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60'
                    )}>
                      {typeFilter === 'all' ? '全部' : MATERIAL_TYPE_LABELS[typeFilter]}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      全部类型
                    </div>
                  </SelectItem>
                  <SelectItem value="artist">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      艺术家
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <div className="h-8 w-px bg-border/60 hidden md:block" />

              <ArrowUpDown className="w-4 h-4 text-muted-foreground/60" />
              <div className="flex items-center gap-1">
                <SortButton field="updated_at" currentField={sortField} order={sortOrder} onClick={() => toggleSort('updated_at')}>
                  更新
                </SortButton>
                <SortButton field="created_at" currentField={sortField} order={sortOrder} onClick={() => toggleSort('created_at')}>
                  创建
                </SortButton>
                <SortButton field="name" currentField={sortField} order={sortOrder} onClick={() => toggleSort('name')}>
                  名称
                </SortButton>
              </div>

              <div className="h-8 w-px bg-border/60 hidden lg:block" />

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground/70">结果</span>
                <span className="font-semibold text-foreground">{filteredMaterials.length}</span>
                <span className="text-muted-foreground/50">/ {total}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50" />

          {isLoading && materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary/70" />
              <p className="text-muted-foreground/80 mt-3 text-sm">加载中...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-border/50 bg-background/50 p-6 shadow-sm sm:p-10">
              <EmptyState
                icon={Music}
                title={searchQuery ? '没有找到匹配的素材' : '暂无素材'}
                description={searchQuery ? '换个关键词继续找，或者直接回到全部素材视图。' : '先创建一个人物素材容器，再逐步填充歌曲与风格候选，让工作台从空白进入创作状态。'}
                action={
                  !searchQuery && (
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="gap-2 rounded-xl px-6 py-5 shadow-md shadow-primary/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/95"
                    >
                      <Plus className="w-5 h-5" />
                      创建素材
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="mt-4 grid grid-cols-4 gap-4">
                {filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex h-full flex-col rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Music className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {material.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${MATERIAL_TYPE_COLORS[material.material_type]}`}
                          >
                            {MATERIAL_TYPE_LABELS[material.material_type]}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(material.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {material.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {material.description}
                      </p>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mic2 className="h-3 w-3" />
                          {typeof material.songCount === 'number' ? material.songCount : 0} 歌曲
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {typeof material.promptVariantsCount === 'number' ? material.promptVariantsCount : 0} 变体
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                          onClick={() => navigate(`/materials/${material.id}/edit`)}
                          title={`编辑 ${material.name}`}
                          aria-label={`编辑 ${material.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-border/60 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                          onClick={() => openDeleteConfirm(material.id, material.name)}
                          title={`删除 ${material.name}`}
                          aria-label={`删除 ${material.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => navigate(`/materials/${material.id}/edit`)}
                          size="sm"
                          className="gap-1 rounded-lg px-2.5 py-1 text-xs"
                        >
                          进入
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4">
                <Pagination
                  currentPage={page}
                  totalItems={total}
                  pageSize={limit}
                  onPageChange={setPage}
                  onPageSizeChange={setLimit}
                />
              </div>
            </div>
          )}
        </CardContent>
          </div>
      </Card>
      </motion.div>

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="创建素材"
        description="创建一个新的素材集，用于管理音乐人和歌曲风格"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">素材类型</label>
            <select
              value={newMaterialType}
              onChange={(e) => setNewMaterialType(e.target.value as MaterialType)}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              <option value="artist">{MATERIAL_TYPE_LABELS.artist}</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">素材名称</label>
            <Input
              placeholder="例如：我的音乐人素材"
              value={newMaterialName}
              onChange={(e) => setNewMaterialName(e.target.value)}
              className="h-12 rounded-xl border-border/50 shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">描述（可选）</label>
            <Input
              placeholder="简要描述这个素材的用途"
              value={newMaterialDescription}
              onChange={(e) => setNewMaterialDescription(e.target.value)}
              className="h-12 rounded-xl border-border/50 shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-lg px-5">
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !newMaterialName.trim()}
            className="gap-1.5 rounded-lg px-5 shadow-md shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            创建素材
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        description={`确定要删除素材 "${deleteConfirm?.name}" 吗？此操作无法撤销。`}
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-lg px-5">
            取消
          </Button>
          <Button variant="destructive" onClick={handleDelete} className="rounded-lg px-5 gap-1.5">
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
