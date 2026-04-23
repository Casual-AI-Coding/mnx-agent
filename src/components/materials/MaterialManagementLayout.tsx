import { useEffect, useState } from 'react'
import { FolderCog, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
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
import type { CreateMaterial } from '@/types/material'

export function MaterialManagementLayout() {
  const { materials, isLoading, error, fetchMaterials, addMaterial, removeMaterial, clearError } = useMaterialsStore()
  const { isHydrated } = useAuthStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newMaterialName, setNewMaterialName] = useState('')
  const [newMaterialDescription, setNewMaterialDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isHydrated) {
      fetchMaterials()
    }
  }, [isHydrated, fetchMaterials])

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCreate = async () => {
    if (!newMaterialName.trim()) {
      toastError('请输入素材名称')
      return
    }
    setIsCreating(true)
    const data: CreateMaterial = {
      material_type: 'artist',
      name: newMaterialName.trim(),
      description: newMaterialDescription.trim() || undefined,
    }
    const success = await addMaterial(data)
    setIsCreating(false)
    if (success) {
      toastSuccess('创建成功', `素材 "${newMaterialName}" 已创建`)
      setNewMaterialName('')
      setNewMaterialDescription('')
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FolderCog className="w-5 h-5" />}
        title="素材管理"
        description="管理艺术家素材和提示词"
        gradient="green-emerald"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索素材..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-2">加载中...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <EmptyState
              icon={FolderCog}
              title={searchQuery ? '没有找到匹配的素材' : '暂无素材'}
              description={searchQuery ? '尝试其他搜索词' : '创建您的第一个素材'}
              action={
                !searchQuery && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    创建素材
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredMaterials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{material.name}</p>
                    {material.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {material.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/materials/${material.id}/edit`)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteConfirm(material.id, material.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
        description="创建一个新的艺术家素材"
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">素材名称</label>
            <Input
              placeholder="输入素材名称"
              value={newMaterialName}
              onChange={(e) => setNewMaterialName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">描述（可选）</label>
            <Input
              placeholder="输入素材描述"
              value={newMaterialDescription}
              onChange={(e) => setNewMaterialDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !newMaterialName.trim()}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            创建
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        description={`确定要删除素材 "${deleteConfirm?.name}" 吗？此操作无法撤销。`}
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            删除
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
