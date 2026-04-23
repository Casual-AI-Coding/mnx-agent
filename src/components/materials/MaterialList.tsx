import { FileText, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useMaterialsStore } from '@/stores/materials'
import { useState } from 'react'

interface MaterialListProps {
  onDelete?: (id: string, name: string) => void
}

export function MaterialList({ onDelete }: MaterialListProps) {
  const { materials, isLoading } = useMaterialsStore()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (isLoading && materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground mt-2">加载中...</p>
      </div>
    )
  }

  if (filteredMaterials.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={searchQuery ? '没有找到匹配的素材' : '暂无素材'}
        description={searchQuery ? '尝试其他搜索词' : '创建您的第一个素材'}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索素材..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filteredMaterials.map((material) => (
          <Card key={material.id} className="hover:border-border/80 transition-colors">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{material.name}</p>
                  {material.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {material.description}
                    </p>
                  )}
                </div>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(material.id, material.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
