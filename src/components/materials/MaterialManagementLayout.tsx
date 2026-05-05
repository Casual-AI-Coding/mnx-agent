import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Music, Plus, Search, Trash2, X, Mic2, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { useMaterialsStore } from '@/stores/materials'
import { useAuthStore } from '@/stores/auth'
import { toastSuccess, toastError } from '@/lib/toast'
import type { CreateMaterial, MaterialType } from '@/types/material'
import { MATERIAL_TYPE_LABELS } from '@/types/material'
import { MaterialFilterBar } from './material-layout/MaterialFilterBar'
import { MaterialGrid } from './material-layout/MaterialGrid'
import { CreateMaterialDialog } from './material-layout/CreateMaterialDialog'
import { DeleteConfirmDialog } from './material-layout/DeleteConfirmDialog'

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
              <MaterialFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                typeFilter={typeFilter}
                onTypeFilterChange={(v) => setTypeFilter(v as MaterialType | 'all')}
                sortField={sortField}
                sortOrder={sortOrder}
                onToggleSort={toggleSort}
                filteredCount={filteredMaterials.length}
                totalCount={total}
              />

              <div className="border-t border-border/50" />

              <MaterialGrid
                isLoading={isLoading}
                materials={materials}
                filteredMaterials={filteredMaterials}
                searchQuery={searchQuery}
                total={total}
                page={page}
                limit={limit}
                onCreateClick={() => setIsCreateDialogOpen(true)}
                onEdit={(id) => navigate(`/materials/${id}/edit`)}
                onDelete={openDeleteConfirm}
                onNavigate={(id) => navigate(`/materials/${id}/edit`)}
                onPageChange={setPage}
                onPageSizeChange={setLimit}
                formatDate={formatDate}
              />
            </CardContent>
          </div>
        </Card>
      </motion.div>

      <CreateMaterialDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        name={newMaterialName}
        onNameChange={setNewMaterialName}
        description={newMaterialDescription}
        onDescriptionChange={setNewMaterialDescription}
        materialType={newMaterialType}
        onTypeChange={setNewMaterialType}
        isCreating={isCreating}
        onCreate={handleCreate}
      />

      <DeleteConfirmDialog
        open={deleteConfirm !== null}
        materialName={deleteConfirm?.name ?? null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
