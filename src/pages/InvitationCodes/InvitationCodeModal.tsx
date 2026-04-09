import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import type { InvitationCodeModalProps, GenerateFormData } from './types'

export function InvitationCodeModal({
  open,
  onClose,
  onGenerate,
  loading,
}: InvitationCodeModalProps) {
  const [form, setForm] = useState<GenerateFormData>({
    count: 10,
    max_uses: 1,
    expires_at: '',
  })

  const handleClose = () => {
    if (!loading) {
      setForm({ count: 10, max_uses: 1, expires_at: '' })
      onClose()
    }
  }

  const handleSubmit = () => {
    onGenerate(form)
  }

  return (
    <Dialog open={open} onClose={handleClose} title="批量生成邀请码">
      <div className="space-y-4 py-4">
        <div>
          <label className="text-sm font-medium text-foreground">生成数量 *</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={form.count}
            onChange={e => setForm({ ...form, count: parseInt(e.target.value) || 1 })}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">1-100 个</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">最大使用次数 *</label>
          <Input
            type="number"
            min={1}
            value={form.max_uses}
            onChange={e => setForm({ ...form, max_uses: parseInt(e.target.value) || 1 })}
            disabled={loading}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">过期时间</label>
          <Input
            type="datetime-local"
            value={form.expires_at}
            onChange={e => setForm({ ...form, expires_at: e.target.value })}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">不填则永久有效</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={cn('bg-warning hover:bg-warning/90', status.warning.bg, status.warning.foreground)}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Sparkles className="w-4 h-4 mr-2" />
          生成
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
