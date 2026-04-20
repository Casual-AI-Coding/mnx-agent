// src/components/lyrics/LyricsPreviewModal.tsx

import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Download, Edit3, Copy, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaRecord } from '@/types/media'
import { parseLyricsSections, getSectionDisplayName } from '@/lib/utils/lyrics'
import type { LyricsSection } from '@/types/lyrics'
import { formatDate } from '@/lib/utils/media'
import { toastSuccess } from '@/lib/toast'
import { toggleFavorite } from '@/lib/api/media'

interface LyricsPreviewModalProps {
  record: MediaRecord
  open: boolean
  onClose: () => void
  onEdit?: (record: MediaRecord) => void
  onFavoriteToggle?: (record: MediaRecord) => void
}

// Segment types for rendering lyrics with active highlighting
type LyricsSegment =
  | { type: 'text'; content: string }
  | { type: 'section'; section: LyricsSection; index: number; content: string }

/**
 * Split lyrics text into segments for React rendering with section awareness
 */
function parseLyricsSegments(lyrics: string, sections: LyricsSection[]): LyricsSegment[] {
  if (sections.length === 0) {
    return [{ type: 'text', content: lyrics }]
  }

  const segments: LyricsSegment[] = []
  let lastIndex = 0

  sections.forEach((section, idx) => {
    // Text before this section
    if (section.startIndex > lastIndex) {
      const text = lyrics.slice(lastIndex, section.startIndex)
      if (text) {
        segments.push({ type: 'text', content: text })
      }
    }

    // Get section content (from tag end to next tag or end)
    const contentStart = section.startIndex + (`[${section.rawTag || section.type}${section.number ? ' ' + section.number : ''}]`).length
    let contentEnd = lyrics.length
    if (idx + 1 < sections.length) {
      contentEnd = sections[idx + 1].startIndex
    }
    const content = lyrics.slice(contentStart, contentEnd)

    segments.push({
      type: 'section',
      section,
      index: idx,
      content: content.trim(),
    })

    lastIndex = contentEnd
  })

  // Remaining text after last section
  if (lastIndex < lyrics.length) {
    segments.push({ type: 'text', content: lyrics.slice(lastIndex) })
  }

  return segments
}

export function LyricsPreviewModal({
  record,
  open,
  onClose,
  onEdit,
  onFavoriteToggle,
}: LyricsPreviewModalProps) {
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null)
  const [isFavorite, setIsFavorite] = useState(record.is_favorite ?? false)
  const [isCopying, setIsCopying] = useState(false)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)

  // Get lyrics from metadata
  const metadata = record.metadata as {
    title?: string
    style_tags?: string | string[]
    lyrics?: string
    mode?: string
    prompt?: string
    generated_at?: string
  } | null

  const lyrics = metadata?.lyrics || ''
  const title = metadata?.title || record.filename
  const styleTags = Array.isArray(metadata?.style_tags)
    ? metadata.style_tags
    : (metadata?.style_tags ? metadata.style_tags.split(',').map(s => s.trim()) : [])
  const generatedAt = metadata?.generated_at || record.created_at

  const sections = parseLyricsSections(lyrics)
  const segments = parseLyricsSegments(lyrics, sections)

  // Scroll to section using manual calculation for precise positioning
  const scrollToSection = useCallback((sectionIndex: number | null) => {
    const container = lyricsContainerRef.current
    if (!container) return

    if (sectionIndex === null) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Find the section wrapper element by data attribute
    const targetEl = container.querySelector(`[data-section-index="${sectionIndex}"]`)
    if (targetEl) {
      const containerRect = container.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()
      const offsetTop = targetRect.top - containerRect.top + container.scrollTop - 16
      container.scrollTo({ top: offsetTop, behavior: 'smooth' })
    }
  }, [])

  const handleSectionClick = (sectionIndex: number | null) => {
    setActiveSectionIndex(sectionIndex)
    scrollToSection(sectionIndex)
  }

  const handleExport = () => {
    const content = lyrics
    const filename = `${title}.txt`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    toastSuccess('歌词已导出')
  }

  const handleCopy = async () => {
    if (isCopying) return
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(lyrics)
      toastSuccess('歌词已复制到剪贴板')
    } catch {
      toastSuccess('复制失败')
    } finally {
      setIsCopying(false)
    }
  }

  const handleFavoriteToggle = async () => {
    try {
      const result = await toggleFavorite(record.id)
      const newFavoriteState = result.data.isFavorite
      setIsFavorite(newFavoriteState)
      onFavoriteToggle?.({ ...record, is_favorite: newFavoriteState })
      toastSuccess(newFavoriteState ? '已收藏' : '已取消收藏')
    } catch {
      toastSuccess('操作失败')
    }
  }

  useEffect(() => {
    if (open) {
      setActiveSectionIndex(null)
      setIsFavorite(record.is_favorite ?? false)
    }
  }, [open, record.is_favorite])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      className="h-[80vh] flex flex-col"
    >
      {styleTags.length > 0 && (
        <div className="flex gap-1 mb-3">
          {styleTags.map((tag, i) => (
            <span
              key={i}
              className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Left sidebar - section list */}
        <div className="w-36 border-r border-border pr-4 overflow-y-auto">
          <div className="space-y-1">
            <button
              onClick={() => handleSectionClick(null)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-sm transition-all duration-300',
                activeSectionIndex === null
                  ? 'bg-primary/20 text-primary font-medium shadow-sm'
                  : 'hover:bg-muted/50 text-muted-foreground'
              )}
            >
              全量歌词
            </button>

            {sections.map((section, i) => {
              const displayName = getSectionDisplayName(section)
              const isActive = activeSectionIndex === i

              return (
                <button
                  key={i}
                  onClick={() => handleSectionClick(i)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm transition-all duration-300',
                    isActive
                      ? 'bg-primary/20 text-primary font-medium shadow-sm'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  {displayName}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right content - lyrics display */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={lyricsContainerRef}
            className="h-full overflow-y-auto pr-2"
          >
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {segments.map((segment, segIdx) => {
                if (segment.type === 'text') {
                  return <span key={segIdx} className="text-foreground/80">{segment.content}</span>
                }

                const { section, index, content } = segment
                const isActive = activeSectionIndex === index
                const tagText = `[${section.rawTag || section.type}${section.number ? ' ' + section.number : ''}]`

                return (
                  <span key={segIdx} data-section-index={index}>
                    {/* Section tag with highlight when active */}
                    <span
                      className={cn(
                        'transition-all duration-500',
                        isActive && 'text-primary font-semibold'
                      )}
                    >
                      {tagText}
                    </span>
                    {/* Section content with subtle highlight when active */}
                    <span
                      className={cn(
                        'relative block my-1 transition-all duration-700',
                        isActive && 'bg-primary/5 px-2 py-1 rounded'
                      )}
                    >
                      {content}
                    </span>
                  </span>
                )
              })}
            </pre>
          </div>
        </div>
      </div>

      <DialogFooter className="border-t border-border pt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          创建时间: {formatDate(generatedAt)}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={isCopying}
          >
            <Copy className="w-3 h-3 mr-1" />
            复制
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFavoriteToggle}
            className={cn(
              'hover:text-yellow-500 transition-colors',
              isFavorite && 'text-yellow-500'
            )}
          >
            <Star className={cn('w-3 h-3 mr-1', isFavorite && 'fill-current')} />
            {isFavorite ? '已收藏' : '收藏'}
          </Button>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onEdit(record)
                onClose()
              }}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              编辑
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
          >
            <Download className="w-3 h-3 mr-1" />
            导出 TXT
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}