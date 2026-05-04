import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ArtistBasicInfoPanel } from './ArtistBasicInfoPanel'
import { ArtistPromptPanel } from './ArtistPromptPanel'
import { SongLibraryPanel, type SongWithPrompts } from './SongLibraryPanel'
import { SongPromptPanel } from './SongPromptPanel'
import { Card, CardContent } from '@/components/ui/Card'
import { getMaterialDetail } from '@/lib/api/materials'
import type { MaterialDetailResult } from '@/types/material'
import type { PromptRecord } from '@/types/prompt'

type ArtistItemWithPrompts = SongWithPrompts

interface ArtistWorkspaceProps {
  materialId: string
  initialDetail?: MaterialDetailResult
}

export function ArtistWorkspace({ materialId, initialDetail }: ArtistWorkspaceProps) {
  const [detail, setDetail] = useState<MaterialDetailResult | null>(initialDetail ?? null)
  const [isLoading, setIsLoading] = useState(initialDetail ? false : true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSongId, setSelectedSongId] = useState<string | null>(initialDetail?.items[0]?.id ?? null)

  const fetchDetail = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getMaterialDetail(materialId)
    if (result.success && result.data) {
      const nextDetail = result.data

      setDetail(nextDetail)
      setSelectedSongId((currentSelectedSongId) => {
        if (nextDetail.items.length === 0) {
          return null
        }

        const hasCurrentSelection = currentSelectedSongId
          ? nextDetail.items.some((item) => item.id === currentSelectedSongId)
          : false

        return hasCurrentSelection ? currentSelectedSongId : nextDetail.items[0].id
      })
    } else {
      setError(result.error || '加载失败')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (initialDetail) {
      setDetail(initialDetail)
      setSelectedSongId(initialDetail.items[0]?.id ?? null)
      setIsLoading(false)
      setError(null)
      return
    }

    fetchDetail()
  }, [initialDetail, materialId])

  const updateMaterial = (material: MaterialDetailResult['material']) => {
    setDetail((currentDetail) => {
      if (!currentDetail) return currentDetail

      return {
        ...currentDetail,
        material,
      }
    })
  }

  const updateMaterialPrompts = (materialPrompts: PromptRecord[]) => {
    setDetail((currentDetail) => {
      if (!currentDetail) return currentDetail

      return {
        ...currentDetail,
        materialPrompts,
      }
    })
  }

  const updateSongs = (
    items: SongWithPrompts[],
    nextSelectedSongId?: string | null
  ) => {
    setDetail((currentDetail) => {
      if (!currentDetail) return currentDetail

      return {
        ...currentDetail,
        items,
      }
    })

    if (nextSelectedSongId !== undefined) {
      setSelectedSongId(nextSelectedSongId)
      return
    }

    setSelectedSongId((currentSelectedSongId) => {
      if (items.length === 0) {
        return null
      }

      if (currentSelectedSongId && items.some((item) => item.id === currentSelectedSongId)) {
        return currentSelectedSongId
      }

      return items[0].id
    })
  }

  const updateSongPrompts = (songId: string, prompts: PromptRecord[]) => {
    setDetail((currentDetail) => {
      if (!currentDetail) return currentDetail

      return {
        ...currentDetail,
        items: currentDetail.items.map((item) =>
          item.id === songId
            ? {
                ...item,
                prompts,
              }
            : item
        ),
      }
    })
  }

  const selectedSong = detail?.items.find((item) => item.id === selectedSongId) as ArtistItemWithPrompts | undefined

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <Card className="p-6">
        <CardContent>
          <p className="text-destructive">{error || '无法加载素材详情'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-xl border border-border/40 bg-gradient-to-r from-background via-background to-indigo-500/[0.03] p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Artist Workspace</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{detail.material.name}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                左侧维护人物档案和全局风格母板，右侧负责歌曲编目与当前歌曲的风格工作区。
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              当前选中：
              <span className="font-medium text-foreground">{selectedSong?.name || '未选择'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ArtistBasicInfoPanel
            material={detail.material}
            onMaterialChange={updateMaterial}
          />
          <ArtistPromptPanel
            prompts={detail.materialPrompts}
            targetId={detail.material.id}
            onPromptsChange={updateMaterialPrompts}
          />
        </div>
        <div className="space-y-5">
          <SongLibraryPanel
            songs={detail.items}
            selectedSongId={selectedSongId}
            onSelectSong={setSelectedSongId}
            onSongsChange={updateSongs}
            materialId={materialId}
          />
          <SongPromptPanel
            prompts={selectedSong?.prompts || []}
            songId={selectedSongId}
            onPromptsChange={(prompts) => {
              if (!selectedSongId) return
              updateSongPrompts(selectedSongId, prompts)
            }}
          />
        </div>
      </div>
    </div>
  )
}
