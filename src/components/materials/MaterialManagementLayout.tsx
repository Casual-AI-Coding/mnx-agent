import { useEffect, useRef, useState } from 'react'
import { FolderCog, Loader2, Pencil, Plus, Search, Trash2, X, Calendar, Sparkles, Library, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { useMaterialsStore } from '@/stores/materials'
import { useAuthStore } from '@/stores/auth'
import { toastSuccess, toastError } from '@/lib/toast'
import type { CreateMaterial, MaterialType } from '@/types/material'
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPE_COLORS } from '@/types/material'

export function MaterialManagementLayout() {
  const { materials, isLoading, error, fetchMaterials, addMaterial, removeMaterial, clearError } = useMaterialsStore()
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
    <div className="space-y-8">
      <PageHeader
        icon={<FolderCog className="w-5 h-5" />}
        title="素材管理"
        description="管理素材、条目和提示词"
        gradient="green-emerald"
        actions={
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="gap-1.5 rounded-lg border border-primary/20 bg-primary px-5 shadow-md shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            创建素材
          </Button>
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

      <Card className="overflow-hidden border-border/50 bg-card shadow-lg shadow-black/5 hover:shadow-xl hover:border-primary/25 transition-all duration-300">
        <CardHeader className="border-b border-border/50 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-200/90">
                <Sparkles className="h-3.5 w-3.5" />
                Materials Studio
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">素材策展台</p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  先建立人物素材容器，再持续扩充歌曲、人物风格与歌曲风格候选，让创作资产保持可编辑、可筛选、可继续生长。
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-xl border border-border/60 bg-background/90 p-4 shadow-md shadow-black/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">总素材数</p>
                <p className="mt-2.5 text-3xl font-bold tracking-tight text-foreground">{materials.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/90 p-4 shadow-md shadow-black/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">当前视图</p>
                <p className="mt-2.5 text-base font-bold tracking-tight text-foreground">
                  {isSearching ? '搜索结果' : '全部素材'}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/90 p-4 shadow-md shadow-black/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">可继续动作</p>
                <p className="mt-2.5 text-base font-bold tracking-tight text-foreground">创建 / 编辑 / 清理</p>
              </div>
            </div>
          </div>
        </CardHeader>

          <CardContent className="pt-5">
            <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/95 p-5 shadow-md shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-lg">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/70" />
                  <Input
                    placeholder="搜索素材..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 rounded-xl border-border/60 bg-background pl-11 shadow-sm transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/50"
                  />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors hover:bg-accent/80"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-4 py-2.5 text-sm font-medium text-foreground shadow-sm">
                  <Library className="h-4 w-4 text-emerald-400" />
                  共 {filteredMaterials.length} 个素材
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-4 py-2.5 text-sm font-medium shadow-sm">
                  <Sparkles className="h-4 w-4 text-primary/70" />
                  {isSearching ? '已进入筛选视图' : '可直接进入编辑工作台'}
                </div>
              </div>
            </div>

          {isLoading && materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary/70" />
              <p className="text-muted-foreground/80 mt-3 text-sm">加载中...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-border/50 bg-background/50 p-6 shadow-sm sm:p-10">
              <EmptyState
                icon={FolderCog}
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
            <div className="mt-5 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
              {filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="group flex min-h-[300px] h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
                  >
                    <div className="flex flex-1 flex-col gap-5 p-7">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <p className="truncate text-xl font-bold tracking-tight text-foreground/95">
                          {material.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] ${MATERIAL_TYPE_COLORS[material.material_type]} shadow-sm`}
                          >
                            {MATERIAL_TYPE_LABELS[material.material_type]}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground/90">
                            <Calendar className="h-3 w-3 text-muted-foreground/70" />
                            {formatDate(material.updated_at)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
                            <Sparkles className="h-3 w-3" />
                            {typeof material.songCount === 'number' ? `歌曲 ${material.songCount}` : '歌曲 0'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                            <Library className="h-3 w-3" />
                            {typeof material.promptVariantsCount === 'number' ? `变体 ${material.promptVariantsCount}` : '变体 0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {material.description && (
                      <p className="line-clamp-3 text-[15px] leading-relaxed text-foreground/65">
                        {material.description}
                      </p>
                    )}

                    <div className="mt-auto flex items-center gap-2 border-t border-border/40 pt-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-muted-foreground/70 transition-all duration-200 hover:bg-primary/8 hover:text-primary"
                        onClick={() => navigate(`/materials/${material.id}/edit`)}
                        title={`编辑 ${material.name}`}
                        aria-label={`编辑 ${material.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-muted-foreground/70 transition-all duration-200 hover:bg-destructive/8 hover:text-destructive"
                        onClick={() => openDeleteConfirm(material.id, material.name)}
                        title={`删除 ${material.name}`}
                        aria-label={`删除 ${material.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => navigate(`/materials/${material.id}/edit`)}
                        size="sm"
                        className="ml-auto gap-1.5 rounded-lg bg-primary/90 px-3.5 text-white shadow-sm shadow-primary/20 transition-all duration-300 hover:bg-primary hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
                      >
                        继续编辑
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="创建素材"
        description="创建一个新的素材集，用于管理音乐人和歌曲风格"
      >
          <div className="space-y-4 py-2">
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
            <p className="font-medium text-foreground">从一个新的素材容器开始</p>
            <p className="mt-1">
              先命名这次创作资产，再进入工作台持续补充人物档案、歌曲库与风格提示词候选。
            </p>
          </div>
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
