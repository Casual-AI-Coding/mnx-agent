import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  previewUrl: string | undefined
  onClose: () => void
}

export function FullscreenPreview({ previewUrl, onClose }: Props) {
  if (!previewUrl) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>
      <img
        src={previewUrl}
        alt="Fullscreen preview"
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body
  )
}
