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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
  )
}
