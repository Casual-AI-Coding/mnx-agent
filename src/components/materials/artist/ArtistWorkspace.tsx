import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ArtistBasicInfoPanel } from './ArtistBasicInfoPanel'
import { ArtistPromptPanel } from './ArtistPromptPanel'
import { SongLibraryPanel } from './SongLibraryPanel'
import { SongPromptPanel } from './SongPromptPanel'
import { Card, CardContent } from '@/components/ui/Card'
import { getMaterialDetail } from '@/lib/api/materials'
import type { MaterialDetailResult, MaterialItem } from '@/types/material'
import type { PromptRecord } from '@/types/prompt'

type ArtistItemWithPrompts = MaterialItem & { prompts: PromptRecord[] }

interface ArtistWorkspaceProps {
  materialId: string
}

export function ArtistWorkspace({ materialId }: ArtistWorkspaceProps) {
  const [detail, setDetail] = useState<MaterialDetailResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)

  const fetchDetail = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getMaterialDetail(materialId)
    if (result.success && result.data) {
      setDetail(result.data)
      if (result.data.items.length > 0) {
        setSelectedSongId(result.data.items[0].id)
      }
    } else {
      setError(result.error || '加载失败')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchDetail()
  }, [materialId])

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <ArtistBasicInfoPanel
          material={detail.material}
          onMaterialChange={fetchDetail}
        />
        <ArtistPromptPanel
          prompts={detail.materialPrompts}
          targetId={detail.material.id}
          onPromptsChange={fetchDetail}
        />
      </div>
      <div className="space-y-4">
        <SongLibraryPanel
          songs={detail.items as MaterialItem[]}
          selectedSongId={selectedSongId}
          onSelectSong={setSelectedSongId}
          onSongsChange={fetchDetail}
          materialId={materialId}
        />
        <SongPromptPanel
          prompts={selectedSong?.prompts || []}
          songId={selectedSongId}
          onPromptsChange={fetchDetail}
        />
      </div>
    </div>
  )
}