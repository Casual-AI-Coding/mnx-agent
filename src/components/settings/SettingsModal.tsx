import { createPortal } from 'react-dom'
import { X, Settings } from 'lucide-react'
import { ThemePicker } from './ThemePicker'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl mx-4 bg-dark-950/95 backdrop-blur-xl border border-dark-700 rounded-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Settings className="w-5 h-5" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Theme</h3>
            <ThemePicker />
          </section>
        </div>

        <div className="p-4 border-t border-dark-800 bg-dark-900/50">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="bg-dark-700 rounded px-1.5 py-0.5 text-xs font-mono text-white">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}