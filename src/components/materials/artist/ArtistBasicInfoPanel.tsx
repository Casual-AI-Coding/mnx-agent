import { useEffect, useMemo, useState } from 'react'
import { FileText, Save, Sparkles } from 'lucide-react'
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
    <Card className="h-full overflow-hidden border-sky-500/15 bg-gradient-to-br from-card via-card to-sky-500/5 shadow-xl shadow-black/10">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-sky-200/90">
              <FileText className="h-3.5 w-3.5" />
              Artist Dossier
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-[0.01em]">基本信息</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                先把人物档案写清楚，再让歌曲与风格候选围绕同一位创作者持续展开。
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/70 px-3 py-2 text-right shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">当前状态</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{hasChanges ? '待保存更新' : '档案已同步'}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div>
          <label htmlFor="artist-material-name" className="mb-2 block text-sm font-medium text-muted-foreground">
            素材名称
          </label>
          <Input
            id="artist-material-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="素材名称"
            className="h-12 rounded-2xl border-border/50 bg-background/80 text-base shadow-sm transition-all duration-200 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
          />
        </div>
        <div>
          <label htmlFor="artist-material-description" className="mb-2 block text-sm font-medium text-muted-foreground">
            描述
          </label>
          <Input
            id="artist-material-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述信息"
            className="h-12 rounded-2xl border-border/50 bg-background/80 shadow-sm transition-all duration-200 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
          />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/60 p-4 shadow-inner shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 text-sky-300" />
            <p className="max-w-md leading-6">
              档案卡是整个工作台的主轴。名字与描述越清晰，后续人物风格与歌曲资产越容易保持统一。
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={Boolean(saveDisabledReason) || !hasChanges || !name.trim()}
            title={saveDisabledReason || undefined}
            className="rounded-xl px-5 shadow-lg shadow-sky-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-500/20"
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
