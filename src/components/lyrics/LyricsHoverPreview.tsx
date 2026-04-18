// src/components/lyrics/LyricsHoverPreview.tsx

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText } from 'lucide-react'
import type { MediaRecord } from '@/types/media'
import { extractLyricsSnippet, highlightSectionTags } from '@/lib/utils/lyrics'

interface LyricsHoverPreviewProps {
  record: MediaRecord
  mousePosition: { x: number; y: number }
  visible: boolean
}

export function LyricsHoverPreview({
  record,
  mousePosition,
  visible,
}: LyricsHoverPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Get lyrics from metadata
  const metadata = record.metadata as {
    title?: string
    style_tags?: string[]
    lyrics?: string
  } | null

  const lyrics = metadata?.lyrics || ''
  const title = metadata?.title || record.filename
  const styleTags = Array.isArray(metadata?.style_tags) ? metadata.style_tags : (metadata?.style_tags ? [metadata.style_tags] : [])

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

  if (record.type !== 'lyrics' || !lyrics) return null

  const snippet = extractLyricsSnippet(lyrics, 10)
  const highlightedSnippet = highlightSectionTags(snippet)

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
            width: 400,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="rounded-lg overflow-hidden shadow-2xl border border-border bg-card"
        >
          {/* Header */}
          <div className="p-3 bg-card/95 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{title}</p>
              {styleTags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {styleTags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-1 py-0.5 rounded bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lyrics snippet */}
          <div className="p-3 bg-muted/30">
            <pre
              className="whitespace-pre-wrap font-sans text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}