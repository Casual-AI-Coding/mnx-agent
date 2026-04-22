// src/components/lyrics/LyricsTaskCarousel.tsx

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, X, Loader2, Edit3, Download, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toastSuccess, toastError } from '@/lib/toast'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

function useLyricsFocus(containerRef: React.RefObject<HTMLDivElement | null>, lineCount: number) {
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const rafId = useRef<number>(0)

  const applyFocus = useCallback(() => {
    const container = containerRef.current
    if (!container || lineCount === 0) return

    const containerRect = container.getBoundingClientRect()
    const centerY = containerRect.top + containerRect.height / 2
    const threshold = containerRect.height * 1.2

    lineRefs.current.forEach((line) => {
      if (!line) return
      const lineRect = line.getBoundingClientRect()
      const lineCenterY = lineRect.top + lineRect.height / 2
      const distance = Math.abs(lineCenterY - centerY)
      const focus = Math.max(0, 1 - distance / threshold)
      const isSection = /^\[.*\]$/.test(line.textContent?.trim() || '')

      line.style.opacity = isSection
        ? String(0.5 + focus * 0.5)
        : String(0.2 + focus * 0.8)
      line.style.filter = isSection ? 'none' : `blur(${(1 - focus) * 2}px)`
      line.style.transform = `scale(${0.96 + focus * 0.04})`
      line.style.fontWeight = isSection ? '700' : String(400 + Math.round(focus * 300))
      if (!isSection) {
        line.style.color = `color-mix(in oklab, hsl(var(--foreground)) ${20 + focus * 80}%, hsl(var(--muted-foreground)))`
      } else {
        line.style.color = ''
      }
    })
  }, [containerRef, lineCount])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(applyFocus)
    }

    applyFocus()
    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [containerRef, applyFocus])

  return { lineRefs }
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
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const lyricsLines = result.lyrics.split('\n').filter(line => line.trim() !== '')
  const { lineRefs } = useLyricsFocus(lyricsContainerRef, lyricsLines.length)

  useEffect(() => {
    const container = lyricsContainerRef.current
    if (!container) return
    const wrapper = container.firstElementChild as HTMLElement | null
    if (!wrapper) return

    const adjust = () => {
      const h = container.clientHeight
      const pad = Math.max(0, h / 2 - 14)
      wrapper.style.paddingTop = `${pad}px`
      wrapper.style.paddingBottom = `${pad}px`
    }

    adjust()
    const resizeObserver = new ResizeObserver(adjust)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [lyricsLines.length])

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
          ref={lyricsContainerRef}
          className="flex-1 overflow-y-auto px-4 snap-y [&::-webkit-scrollbar]:hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
            scrollSnapType: 'y proximity',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {lyricsLines.map((line, i) => {
              const isSection = /^\[.*\]$/.test(line)
              return (
                <p
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el }}
                  className={cn(
                    "text-center select-none snap-center",
                    isSection
                      ? "text-xs font-bold tracking-widest uppercase text-muted-foreground mt-3 mb-1"
                      : "text-sm leading-relaxed"
                  )}
                >
                  {line}
                </p>
              )
            })}
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
