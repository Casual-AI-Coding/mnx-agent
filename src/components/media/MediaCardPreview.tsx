import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { MediaRecord } from '@/types/media'

interface MediaCardPreviewProps {
  record: MediaRecord
  signedUrl: string
  mousePosition: { x: number; y: number }
  visible: boolean
}

export function MediaCardPreview({
  record,
  signedUrl,
  mousePosition,
  visible,
}: MediaCardPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!visible || !previewRef.current) return

    const preview = previewRef.current
    const rect = preview.getBoundingClientRect()
    const padding = 16
    const offset = 30

    let x = mousePosition.x + offset
    let y = mousePosition.y - rect.height / 2

    if (x + rect.width > window.innerWidth - padding) {
      x = mousePosition.x - rect.width - offset
    }

    if (y < padding) {
      y = padding
    }

    if (y + rect.height > window.innerHeight - padding) {
      y = window.innerHeight - rect.height - padding
    }

    setPosition({ x, y })
  }, [visible, mousePosition])

  if (record.type !== 'image' || !signedUrl) return null

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={previewRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 600,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="rounded-lg overflow-hidden shadow-2xl border border-border bg-card"
        >
          <img
            src={signedUrl}
            alt={record.original_name || record.filename}
            className="w-full h-auto max-h-[32rem] object-contain"
          />
          <div className="p-2 bg-card/95">
            <p className="text-xs text-muted-foreground truncate">
              {record.original_name || record.filename}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
