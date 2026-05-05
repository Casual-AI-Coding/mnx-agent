import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  materialName: string | null
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmDialog({
  open,
  materialName,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="确认删除"
      description={`确定要删除素材 "${materialName}" 吗？此操作无法撤销。`}
    >
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onClose} className="rounded-lg px-5">
          取消
        </Button>
        <Button variant="destructive" onClick={onConfirm} className="rounded-lg px-5 gap-1.5">
          <Trash2 className="w-4 h-4" />
          删除
        </Button>
      </div>
    </Dialog>
  )
}
