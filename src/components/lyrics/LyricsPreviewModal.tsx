// src/components/lyrics/LyricsPreviewModal.tsx

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Download, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaRecord } from '@/types/media'
import { parseLyricsSections, highlightSectionTags, getSectionDisplayName } from '@/lib/utils/lyrics'
import { formatDate } from '@/lib/utils/media'
import { toastSuccess } from '@/lib/toast'

interface LyricsPreviewModalProps {
  record: MediaRecord
  open: boolean
  onClose: () => void
  onEdit?: (record: MediaRecord) => void
}

export function LyricsPreviewModal({
  record,
  open,
  onClose,
  onEdit,
}: LyricsPreviewModalProps) {
  const [activeSection, setActiveSection] = useState<string>('all')
  const lyricsRef = useRef<HTMLDivElement>(null)

  // Get lyrics from metadata
  const metadata = record.metadata as {
    title?: string
    style_tags?: string[]
    lyrics?: string
    mode?: string
    prompt?: string
    generated_at?: string
  } | null

  const lyrics = metadata?.lyrics || ''
  const title = metadata?.title || record.filename
  const styleTags = metadata?.style_tags || []
  const generatedAt = metadata?.generated_at || record.created_at

  const sections = parseLyricsSections(lyrics)
  const highlightedLyrics = highlightSectionTags(lyrics)

  // Scroll to section
  const scrollToSection = (sectionKey: string) => {
    if (sectionKey === 'all') {
      lyricsRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const targetSection = sections.find(s => 
      getSectionDisplayName(s) === sectionKey
    )

    if (targetSection && lyricsRef.current) {
      const totalChars = lyrics.length
      const scrollRatio = targetSection.startIndex / totalChars
      const scrollHeight = lyricsRef.current.scrollHeight
      lyricsRef.current.scrollTo({
        top: scrollHeight * scrollRatio,
        behavior: 'smooth'
      })
    }
  }

  const handleSectionClick = (sectionKey: string) => {
    setActiveSection(sectionKey)
    scrollToSection(sectionKey)
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

  useEffect(() => {
    if (open) {
      setActiveSection('all')
    }
  }, [open])

  const titleWithTags = (
    <div className="flex items-center gap-2">
      <span className="truncate">{title}</span>
      {styleTags.length > 0 && (
        <div className="flex gap-1 ml-2">
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
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleWithTags as unknown as string}
      size="lg"
      className="h-[80vh] flex flex-col"
    >
      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className="w-32 border-r border-border pr-4 overflow-y-auto">
          <div className="space-y-1">
            <button
              onClick={() => handleSectionClick('all')}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                activeSection === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50 text-muted-foreground'
              )}
            >
              全量歌词
            </button>

            {sections.map((section, i) => {
              const displayName = getSectionDisplayName(section)
              return (
                <button
                  key={`${section.type}-${section.number || i}`}
                  onClick={() => handleSectionClick(displayName)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                    activeSection === displayName
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  {displayName}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div
            ref={lyricsRef}
            className="h-full overflow-y-auto pr-2"
          >
            <pre
              className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedLyrics }}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="border-t border-border pt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          创建时间: {formatDate(generatedAt)}
        </div>

        <div className="flex gap-2">
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