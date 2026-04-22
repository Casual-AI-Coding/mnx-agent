// src/components/lyrics/LyricsTaskCarousel.tsx

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, X, Loader2, Edit3, Download, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toastSuccess, toastError } from '@/lib/toast'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

interface LyricsBlock {
  tag: string
  lines: string[]
}

function parseLyricsBlocks(lyrics: string): LyricsBlock[] {
  const lines = lyrics.split('\n')
  const blocks: LyricsBlock[] = []
  let current: LyricsBlock | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (/^\[.*\]$/.test(line)) {
      if (current) blocks.push(current)
      current = { tag: line, lines: [] }
    } else {
      if (!current) current = { tag: '', lines: [] }
      current.lines.push(line)
    }
  }

  if (current) blocks.push(current)
  return blocks
}

function useCenterBlock(containerRef: React.RefObject<HTMLDivElement | null>, blockCount: number) {
  const [activeIndex, setActiveIndex] = useState(0)
  const offsetsRef = useRef<number[]>([])
  const containerHeightRef = useRef(0)

  const recalc = useCallback(() => {
    const container = containerRef.current
    if (!container || blockCount === 0) return

    containerHeightRef.current = container.clientHeight
    const containerRect = container.getBoundingClientRect()
    const sections = container.querySelectorAll('[data-block-index]')

    offsetsRef.current = Array.from(sections).map((s) => {
      const el = s as HTMLElement
      const rect = el.getBoundingClientRect()
      return rect.top + rect.height / 2 - containerRect.top + container.scrollTop
    })
  }, [containerRef, blockCount])

  const update = useCallback(() => {
    const container = containerRef.current
    if (!container || offsetsRef.current.length === 0) return

    const center = container.scrollTop + containerHeightRef.current / 2
    let bestIdx = 0
    let bestDist = Infinity

    offsetsRef.current.forEach((offset, i) => {
      const dist = Math.abs(offset - center)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    })

    setActiveIndex(bestIdx)
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container || blockCount === 0) return

    recalc()

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        update()
        ticking = false
      })
    }

    container.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => {
      recalc()
      update()
    })
    ro.observe(container)

    return () => {
      container.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [containerRef, blockCount, recalc, update])

  return activeIndex
}

interface LyricsTaskCarouselProps {
  tasks: LyricsTask[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onRetry: (index: number) => void
  onEdit: (result: LyricsGenerationResponse) => void
  onExport: (result: LyricsGenerationResponse) => void
}

function truncateLyrics(lyrics: string, maxLines: number = 20): string {
  const lines = lyrics.split('\n').slice(0, maxLines)
  return lines.join('\n')
}

interface LyricsPlayerViewProps {
  result: LyricsGenerationResponse
  onEdit: (result: LyricsGenerationResponse) => void
  onExport: (result: LyricsGenerationResponse) => void
}

function LyricsPlayerView({ result, onEdit, onExport }: LyricsPlayerViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blocks = parseLyricsBlocks(result.lyrics)
  const activeIndex = useCenterBlock(containerRef, blocks.length)

  useEffect(() => {
    const container = containerRef.current
    if (!container || blocks.length === 0) return

    const setSnapPadding = () => {
      const sections = container.querySelectorAll('[data-block-index]')
      if (sections.length === 0) return
      const containerH = container.clientHeight
      const firstH = sections[0].getBoundingClientRect().height
      const lastH = sections[sections.length - 1].getBoundingClientRect().height
      const topPad = Math.max(0, containerH / 2 - firstH / 2)
      const bottomPad = Math.max(0, containerH / 2 - lastH / 2)
      container.style.scrollPaddingTop = `${topPad}px`
      container.style.scrollPaddingBottom = `${bottomPad}px`
    }

    setSnapPadding()
    requestAnimationFrame(() => {
      const first = container.querySelector('[data-block-index="0"]') as HTMLElement | null
      if (first) {
        const containerH = container.clientHeight
        container.scrollTop = first.offsetTop - containerH / 2 + first.offsetHeight / 2
      }
    })

    const ro = new ResizeObserver(setSnapPadding)
    ro.observe(container)
    const sections = container.querySelectorAll('[data-block-index]')
    sections.forEach((s) => ro.observe(s))
    return () => ro.disconnect()
  }, [blocks.length])

  const handleCopy = async () => {
    if (!result.lyrics) return
    const text = result.lyrics

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        toastSuccess('歌词已复制到剪贴板')
        return
      } catch (err) {
        console.error('Clipboard API failed:', err)
      }
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand('copy')
      toastSuccess('歌词已复制到剪贴板')
    } catch {
      toastError('复制失败，请手动复制')
    }
    document.body.removeChild(textarea)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 text-center pt-2 pb-3">
        {result.song_title && (
          <h2 className="text-lg font-bold text-foreground">
            {result.song_title}
          </h2>
        )}
        {result.style_tags && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {(Array.isArray(result.style_tags)
              ? result.style_tags
              : result.style_tags.split(',').map(s => s.trim())
            ).map((tag, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 relative bg-card border border-border/60 rounded-xl shadow-sm group flex flex-col overflow-hidden">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(result)}
            className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="编辑"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors"
            title="复制"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExport(result)}
            className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors"
            title="导出"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 snap-y [&::-webkit-scrollbar]:hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'y proximity',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex flex-col py-8">
            {blocks.map((block, i) => (
              <section
                key={i}
                data-block-index={i}
                className={cn(
                  "snap-center transition-all duration-300 ease-out rounded-xl px-4 py-3",
                  i === activeIndex
                    ? 'opacity-100 scale-[1.02] text-foreground'
                    : 'opacity-30 scale-100 text-muted-foreground'
                )}
                style={i === activeIndex ? { textShadow: '0 0 18px rgba(147,51,234,0.35), 0 0 40px rgba(147,51,234,0.15)' } : undefined}
              >
                {block.tag && (
                  <p className="text-center text-xs font-bold tracking-widest uppercase text-muted-foreground mt-4 mb-2">
                    {block.tag}
                  </p>
                )}
                <div className="flex flex-col items-center gap-1">
                  {block.lines.map((line, j) => (
                    <p
                      key={j}
                      className="text-center text-sm leading-relaxed select-none"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function LyricsTaskCarousel({
  tasks,
  currentIndex,
  onIndexChange,
  onRetry,
  onEdit,
  onExport,
}: LyricsTaskCarouselProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 blur-3xl rounded-full" />
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-2 border-purple-500/30 rounded-full" />
            <div className="absolute inset-4 border-2 border-pink-500/40 rounded-full" />
            <div className="absolute inset-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
          </div>
        </div>
        <p className="mt-4 text-base font-medium text-foreground">准备就绪</p>
        <p className="text-sm text-muted-foreground mt-1">输入提示词，开始创作歌词</p>
      </div>
    )
  }

  const currentTask = tasks[currentIndex]

  // Generating state
  if (currentTask?.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-amber-500/30 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-purple-500/30 rounded-full animate-ping" />
            <div className="absolute inset-2 border-2 border-pink-500/40 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-4 border-2 border-amber-500/50 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
            <Loader2 className="absolute inset-0 w-full h-full text-purple-400 animate-spin" />
          </div>
        </div>
        <p className="mt-6 text-base font-medium text-foreground">正在创作歌词...</p>
        <p className="text-sm text-muted-foreground mt-1">
          任务 {currentIndex + 1} / {tasks.length}
        </p>
      </div>
    )
  }

  // Failed state
  if (currentTask?.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
          <div className="relative w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <p className="mt-4 text-base font-medium text-foreground">生成失败</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
          {currentTask.error || '未知错误'}
        </p>
        <button
          onClick={() => onRetry(currentIndex)}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  // Completed state - full screen lyrics display
  if (currentTask?.status === 'completed' && currentTask.result) {
    return (
      <LyricsPlayerView
        result={currentTask.result}
        onEdit={onEdit}
        onExport={onExport}
      />
    )
  }

  return null
}
