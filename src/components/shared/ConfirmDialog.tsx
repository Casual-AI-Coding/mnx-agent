import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  requireInput?: string
  loading?: boolean
  size?: 'sm' | 'default' | 'lg'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  requireInput,
  loading = false,
  size = 'default',
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('')

  const canConfirm = requireInput ? inputValue === requireInput : true

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm()
      setInputValue('')
    }
  }

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title} description={description} size={size}>
      <div className="space-y-4">
        {variant === 'destructive' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              此操作无法撤销，请谨慎操作。
            </p>
          </div>
        )}

        {requireInput && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              请输入 <span className="font-mono font-semibold text-foreground">{requireInput}</span> 以确认操作
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requireInput}
              className="font-mono"
              autoFocus
            />
          </div>
        )}
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={handleClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={handleConfirm}
          disabled={!canConfirm || loading}
        >
          {loading && (
            <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}