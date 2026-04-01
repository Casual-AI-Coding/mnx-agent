import { Trash2, Download, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'

export interface BatchOperationsToolbarProps {
  selectedCount: number
  onDelete: () => void
  onDownload: () => void
  onClearSelection: () => void
  isDeleting?: boolean
  isDownloading?: boolean
}

interface BatchDeleteDialogProps {
  isOpen: boolean
  selectedCount: number
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
}

export function BatchDeleteDialog({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
  isDeleting = false,
}: BatchDeleteDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="确认批量删除"
      description={`您即将删除 ${selectedCount} 个文件。此操作无法撤销。`}
    >
      <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg my-4">
        <div className="p-2 bg-destructive/20 rounded-full">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground">
            确定要删除选中的 <strong>{selectedCount}</strong> 个文件吗？
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            文件将被移至回收站，您可以在回收站中恢复它们。
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isDeleting}>
          取消
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isDeleting}
          className="gap-2"
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              删除中...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              删除 {selectedCount} 个文件
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export function BatchOperationsToolbar({
  selectedCount,
  onDelete,
  onDownload,
  onClearSelection,
  isDeleting = false,
  isDownloading = false,
}: BatchOperationsToolbarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 bg-background border rounded-full shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
          {selectedCount}
        </span>
        <span className="text-muted-foreground">
          已选择 {selectedCount} 个项目
        </span>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={isDownloading || isDeleting}
          className="gap-2"
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              下载中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              下载
            </>
          )}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting || isDownloading}
          className="gap-2"
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              删除中...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              删除
            </>
          )}
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        disabled={isDeleting || isDownloading}
        className="gap-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
        清除选择
      </Button>
    </div>
  )
}

export default BatchOperationsToolbar
