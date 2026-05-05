import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { MATERIAL_TYPE_LABELS } from '@/types/material'
import type { MaterialType } from '@/types/material'

interface CreateMaterialDialogProps {
  open: boolean
  onClose: () => void
  name: string
  onNameChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  materialType: MaterialType
  onTypeChange: (value: MaterialType) => void
  isCreating: boolean
  onCreate: () => void
}

export function CreateMaterialDialog({
  open,
  onClose,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  materialType,
  onTypeChange,
  isCreating,
  onCreate,
}: CreateMaterialDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="创建素材"
      description="创建一个新的素材集，用于管理音乐人和歌曲风格"
    >
      <div className="space-y-4 py-2">
        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">素材类型</label>
          <select
            value={materialType}
            onChange={(e) => onTypeChange(e.target.value as MaterialType)}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="artist">{MATERIAL_TYPE_LABELS.artist}</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">素材名称</label>
          <Input
            placeholder="例如：我的音乐人素材"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-12 rounded-xl border-border/50 shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block text-foreground">描述（可选）</label>
          <Input
            placeholder="简要描述这个素材的用途"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="h-12 rounded-xl border-border/50 shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
        <Button variant="outline" onClick={onClose} className="rounded-lg px-5">
          取消
        </Button>
        <Button
          onClick={onCreate}
          disabled={isCreating || !name.trim()}
          className="gap-1.5 rounded-lg px-5 shadow-md shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          创建素材
        </Button>
      </div>
    </Dialog>
  )
}
