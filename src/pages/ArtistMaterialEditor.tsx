import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArtistWorkspace } from '@/components/materials/artist/ArtistWorkspace'
import { getMaterialDetail } from '@/lib/api/materials'
import type { MaterialDetailResult } from '@/types/material'
import { MATERIAL_TYPE_LABELS } from '@/types/material'

export default function ArtistMaterialEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<MaterialDetailResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchDetail = async () => {
      setIsLoading(true)
      setError(null)
      const result = await getMaterialDetail(id)
      if (result.success && result.data) {
        setDetail(result.data)
      } else {
        setError(result.error || '加载失败')
      }
      setIsLoading(false)
    }

    fetchDetail()
  }, [id])

  const renderWorkspace = () => {
    if (!detail) return null

    switch (detail.material.material_type) {
      case 'artist':
        return <ArtistWorkspace materialId={id!} />
      default:
        return (
          <Card className="p-6">
            <CardContent>
              <EmptyState
                title="暂不支持此素材类型的编辑工作台"
                description={`当前仅支持 ${MATERIAL_TYPE_LABELS.artist} 类型的完整编辑流程。`}
              />
            </CardContent>
          </Card>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/materials')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回素材列表
        </Button>
        <Card className="p-6">
          <CardContent>
            <p className="text-destructive">{error || '无法加载素材详情'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/materials')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回素材列表
        </Button>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">素材编辑器</p>
          <h1 className="text-2xl font-bold">{detail.material.name}</h1>
        </div>
      </div>
      {detail && detail.material.material_type === 'artist'
        ? <ArtistWorkspace materialId={id!} initialDetail={detail} />
        : renderWorkspace()}
    </div>
  )
}
