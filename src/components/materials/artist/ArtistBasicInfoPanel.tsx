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
    <Card className="h-full overflow-hidden border border-border/40 bg-card/80 shadow-sm">
      <CardHeader className="border-b border-border/30 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400/80">
                Artist Dossier
              </span>
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">基本信息</CardTitle>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                先把人物档案写清楚，再让歌曲与风格候选围绕同一位创作者持续展开。
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">当前状态</p>
            <p className={`mt-0.5 text-xs font-semibold ${hasChanges ? 'text-amber-400' : 'text-emerald-400'}`}>
              {hasChanges ? '待保存更新' : '档案已同步'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div>
          <label htmlFor="artist-material-name" className="mb-2 block text-sm font-medium text-foreground/80">
            素材名称
          </label>
          <Input
            id="artist-material-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="素材名称"
            className="h-11 rounded-lg border-border/40 bg-background/60 text-sm transition-colors focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/10"
          />
        </div>
        <div>
          <label htmlFor="artist-material-description" className="mb-2 block text-sm font-medium text-foreground/80">
            描述
          </label>
          <Input
            id="artist-material-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述信息"
            className="h-11 rounded-lg border-border/40 bg-background/60 text-sm transition-colors focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/10"
          />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border/30 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400/70" />
            <p className="max-w-md leading-relaxed">
              档案卡是整个工作台的主轴。名字与描述越清晰，后续人物风格与歌曲资产越容易保持统一。
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={Boolean(saveDisabledReason) || !hasChanges || !name.trim()}
            title={saveDisabledReason || undefined}
            size="sm"
            className="shrink-0 gap-1.5 rounded-lg bg-indigo-500 px-4 text-xs font-medium text-white transition-all hover:bg-indigo-500/90 hover:shadow-md hover:shadow-indigo-500/10 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
