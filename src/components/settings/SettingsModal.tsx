import { Dialog, DialogHeader } from '@/components/ui/Dialog'
import { ThemePicker } from './ThemePicker'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-lg bg-dark-950/90 backdrop-blur-xl border-dark-800/50"
    >
      <DialogHeader>
        <h2 className="text-lg font-semibold text-white">Settings</h2>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Theme</h3>
          <ThemePicker />
        </section>
      </div>
    </Dialog>
  )
}