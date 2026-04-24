import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Material } from '@/types/material'
import { updateMaterial } from '@/lib/api/materials'
import { toastSuccess, toastError } from '@/lib/toast'

interface ArtistBasicInfoPanelProps {
  material: Material
  onMaterialChange?: (material: Material) => void
}

export function ArtistBasicInfoPanel({ material, onMaterialChange }: ArtistBasicInfoPanelProps) {
  const [name, setName] = useState(material.name)
  const [description, setDescription] = useState(material.description || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(material.name)
    setDescription(material.description || '')
  }, [material.id, material.name, material.description])

  const saveDisabledReason = useMemo(() => {
    if (isSaving) return '正在保存，请稍候'
    if (!name.trim()) return '请先填写素材名称'
    if (name === material.name && description === (material.description || '')) {
      return '修改内容后才可保存'
    }

    return null
  }, [description, isSaving, material.description, material.name, name])

  const hasChanges = name !== material.name || description !== (material.description || '')

  const handleSave = async () => {
    if (!hasChanges || !name.trim()) return
    setIsSaving(true)
    const result = await updateMaterial(material.id, {
      name: name.trim(),
      description: description.trim() || undefined,
    })
    setIsSaving(false)
    if (result.success && result.data) {
      toastSuccess('保存成功', '基本信息已更新')
      setName(result.data.name)
      setDescription(result.data.description || '')
      onMaterialChange?.(result.data)
    } else {
      toastError('保存失败', result.error || '请稍后重试')
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">基本信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            素材名称
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="素材名称"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            描述
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述信息"
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={Boolean(saveDisabledReason) || !hasChanges || !name.trim()}
            title={saveDisabledReason || undefined}
          >
            <Save className="w-3 h-3 mr-1" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
