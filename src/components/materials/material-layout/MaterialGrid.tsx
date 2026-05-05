import { Music, Loader2, Pencil, Trash2, ArrowRight, Calendar, Mic2, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { cn } from '@/lib/utils'
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPE_COLORS } from '@/types/material'

interface Material {
  id: string
  name: string
  description?: string | null
  material_type: string
  updated_at: string
  songCount?: number
  promptVariantsCount?: number
}

interface MaterialGridProps {
  isLoading: boolean
  materials: Material[]
  filteredMaterials: Material[]
  searchQuery: string
  total: number
  page: number
  limit: number
  onCreateClick: () => void
  onEdit: (id: string) => void
  onDelete: (id: string, name: string) => void
  onNavigate: (id: string) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (limit: number) => void
  formatDate: (dateString: string) => string
}

export function MaterialGrid({
  isLoading,
  materials,
  filteredMaterials,
  searchQuery,
  total,
  page,
  limit,
  onCreateClick,
  onEdit,
  onDelete,
  onNavigate,
  onPageChange,
  onPageSizeChange,
  formatDate,
}: MaterialGridProps) {
  if (isLoading && materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 animate-spin text-primary/70" />
        <p className="text-muted-foreground/80 mt-3 text-sm">加载中...</p>
      </div>
    )
  }

  if (filteredMaterials.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-dashed border-border/50 bg-background/50 p-6 shadow-sm sm:p-10">
        <EmptyState
          icon={Music}
          title={searchQuery ? '没有找到匹配的素材' : '暂无素材'}
          description={searchQuery ? '换个关键词继续找，或者直接回到全部素材视图。' : '先创建一个人物素材容器，再逐步填充歌曲与风格候选，让工作台从空白进入创作状态。'}
          action={
            !searchQuery && (
              <Button
                onClick={onCreateClick}
                className="gap-2 rounded-xl px-6 py-5 shadow-md shadow-primary/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/95"
              >
                <PlusIcon className="w-5 h-5" />
                创建素材
              </Button>
            )
          }
        />
      </div>
    )
  }

  function PlusIcon({ className }: { className?: string }) {
    return (
      <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    )
  }

  return (
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
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${MATERIAL_TYPE_COLORS[material.material_type as keyof typeof MATERIAL_TYPE_COLORS]}`}
                  >
                    {MATERIAL_TYPE_LABELS[material.material_type as keyof typeof MATERIAL_TYPE_LABELS]}
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
                  onClick={() => onEdit(material.id)}
                  title={`编辑 ${material.name}`}
                  aria-label={`编辑 ${material.name}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 border-border/60 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => onDelete(material.id, material.name)}
                  title={`删除 ${material.name}`}
                  aria-label={`删除 ${material.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => onNavigate(material.id)}
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
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  )
}
