# 歌词生成功能 - Preview Components 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现歌词预览组件，包括 hover 预览、详情弹窗和歌词结构解析功能。

**Architecture:** 创建 LyricsHoverPreview（Portal 渲染）、LyricsPreviewModal（Dialog + 结构导航）、parseLyricsSections 工具函数。

**Tech Stack:** React 18, TypeScript, Tailwind CSS, framer-motion, lucide-react

**Spec:** @docs/specs/lyrics-generation-design.md
**Depends on:** @docs/plans/2026-04-18-02-lyrics-generation-frontend.md

---

## File Structure

**Create:**
- `src/lib/utils/lyrics.ts` - 歌词结构解析工具
- `src/components/lyrics/LyricsHoverPreview.tsx` - Hover 预览组件
- `src/components/lyrics/LyricsPreviewModal.tsx` - 详情弹窗组件

---

## Task 1: Lyrics Parser Utility

**Files:**
- Create: `src/lib/utils/lyrics.ts`

- [ ] **Step 1: Create lyrics parser utility**

```typescript
// src/lib/utils/lyrics.ts

import type { LyricsSection } from '@/types/lyrics'

const SECTION_PATTERN = /\[(Verse|Chorus|Bridge|Outro|Hook|Intro)(?:\s+(\d+))?\]/gi

/**
 * Parse lyrics text into structured sections
 * Example: "[Verse 1]\nHello world\n[Chorus]\nSing it loud"
 */
export function parseLyricsSections(lyrics: string): LyricsSection[] {
  const sections: LyricsSection[] = []
  let lastIndex = 0

  // Reset regex
  SECTION_PATTERN.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = SECTION_PATTERN.exec(lyrics)) !== null) {
    const type = match[1].toLowerCase() as LyricsSection['type']
    const number = match[2] ? parseInt(match[2], 10) : undefined
    const startIndex = match.index

    // Get content between this tag and next tag (or end)
    const contentStart = startIndex + match[0].length
    let contentEnd = lyrics.length

    // Find next tag position
    const nextMatch = SECTION_PATTERN.exec(lyrics)
    if (nextMatch) {
      contentEnd = nextMatch.index
      // Reset regex position for next iteration
      SECTION_PATTERN.lastIndex = match.index + match[0].length
    }

    const content = lyrics.slice(contentStart, contentEnd).trim()

    if (content) {
      sections.push({
        type,
        number,
        content,
        startIndex,
      })
    }
  }

  return sections
}

/**
 * Extract lyrics snippet for preview (first section + chorus/hook)
 */
export function extractLyricsSnippet(lyrics: string, maxLines: number = 12): string {
  const sections = parseLyricsSections(lyrics)
  
  if (sections.length === 0) {
    // No structure tags, just return first N lines
    return lyrics.split('\n').slice(0, maxLines).join('\n')
  }

  // Get first section (Verse/Intro)
  const firstSection = sections[0]
  
  // Find first chorus/hook
  const chorusOrHook = sections.find(s => s.type === 'chorus' || s.type === 'hook')
  
  let snippet = firstSection.content
  if (chorusOrHook) {
    snippet += '\n\n' + chorusOrHook.content
  }

  // Limit to maxLines
  const lines = snippet.split('\n').slice(0, maxLines)
  return lines.join('\n')
}

/**
 * Highlight section tags in lyrics text
 * Returns HTML-ready string with highlighted tags
 */
export function highlightSectionTags(lyrics: string): string {
  return lyrics.replace(
    SECTION_PATTERN,
    '<span class="lyrics-section-tag">$&</span>'
  )
}

/**
 * Get display name for section type
 */
export function getSectionDisplayName(section: LyricsSection): string {
  const typeNames: Record<string, string> = {
    verse: 'Verse',
    chorus: 'Chorus',
    bridge: 'Bridge',
    outro: 'Outro',
    hook: 'Hook',
    intro: 'Intro',
  }
  
  const baseName = typeNames[section.type] || section.type
  return section.number ? `${baseName} ${section.number}` : baseName
}
```

- [ ] **Step 2: Verify utility compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/lyrics.ts
git commit -m "feat(utils): add lyrics parser utility"
```

---

## Task 2: LyricsHoverPreview Component

**Files:**
- Create: `src/components/lyrics/LyricsHoverPreview.tsx`

- [ ] **Step 1: Create hover preview component**

```tsx
// src/components/lyrics/LyricsHoverPreview.tsx

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const styleTags = metadata?.style_tags || []

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
```

- [ ] **Step 2: Add CSS for section tag highlighting**

```css
/* Add to global CSS (src/index.css or similar) */
.lyrics-section-tag {
  color: var(--primary);
  font-weight: 600;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
  margin: 0 2px;
}
```

- [ ] **Step 3: Verify component compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/lyrics/LyricsHoverPreview.tsx src/index.css
git commit -m "feat(components): add LyricsHoverPreview component"
```

---

## Task 3: LyricsPreviewModal Component

**Files:**
- Create: `src/components/lyrics/LyricsPreviewModal.tsx`

- [ ] **Step 1: Create preview modal component**

```tsx
// src/components/lyrics/LyricsPreviewModal.tsx

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Download, Edit3, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaRecord } from '@/types/media'
import { parseLyricsSections, highlightSectionTags, getSectionDisplayName } from '@/lib/utils/lyrics'
import { formatDate } from '@/lib/utils/media'
import { toastSuccess } from '@/lib/toast'

interface LyricsPreviewModalProps {
  record: MediaRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (record: MediaRecord) => void
}

export function LyricsPreviewModal({
  record,
  open,
  onOpenChange,
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

    // Find section in parsed sections
    const targetSection = sections.find(s => 
      getSectionDisplayName(s) === sectionKey
    )

    if (targetSection && lyricsRef.current) {
      // Calculate scroll position (approximate based on character position)
      const totalChars = lyrics.length
      const scrollRatio = targetSection.startIndex / totalChars
      const scrollHeight = lyricsRef.current.scrollHeight
      lyricsRef.current.scrollTo({
        top: scrollHeight * scrollRatio,
        behavior: 'smooth'
      })
    }
  }

  // Handle section click
  const handleSectionClick = (sectionKey: string) => {
    setActiveSection(sectionKey)
    scrollToSection(sectionKey)
  }

  // Export lyrics
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

  // Reset active section when modal opens
  useEffect(() => {
    if (open) {
      setActiveSection('all')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
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
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Left: Section navigation */}
          <div className="w-32 border-r border-border pr-4 overflow-y-auto">
            <div className="space-y-1">
              {/* All section */}
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

              {/* Structured sections */}
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

          {/* Right: Lyrics content */}
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

        {/* Footer: Actions + metadata */}
        <div className="border-t border-border pt-3 flex items-center justify-between">
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
                  onOpenChange(false)
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/lyrics/LyricsPreviewModal.tsx
git commit -m "feat(components): add LyricsPreviewModal component"
```

---

## Task 4: Export Components from Index

**Files:**
- Create: `src/components/lyrics/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/components/lyrics/index.ts

export { LyricsTaskCard } from './LyricsTaskCard'
export { LyricsTaskCarousel } from './LyricsTaskCarousel'
export { LyricsHoverPreview } from './LyricsHoverPreview'
export { LyricsPreviewModal } from './LyricsPreviewModal'
```

- [ ] **Step 2: Verify export**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/lyrics/index.ts
git commit -m "feat(components): export lyrics components"
```

---

## Task 5: Final Verification

- [ ] **Step 1: Run frontend tests**

Run: `vitest run src/`
Expected: All tests pass (or pre-existing failures noted)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Exit code 0

- [ ] **Step 3: Check TypeScript diagnostics**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Completion Checklist

- [ ] Lyrics parser utility created
- [ ] LyricsHoverPreview component functional
- [ ] LyricsPreviewModal with section navigation
- [ ] Section tag highlighting CSS added
- [ ] All components exported
- [ ] All tests pass
- [ ] Build succeeds
- [ ] All changes committed