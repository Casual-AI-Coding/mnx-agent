// src/components/lyrics/LyricsTaskCarousel.tsx

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, X, Loader2, Edit3, Download, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toastSuccess, toastError } from '@/lib/toast'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

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
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 blur-3xl rounded-full" />
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-2 border-purple-500/30 rounded-full" />
            <div className="absolute inset-4 border-2 border-pink-500/40 rounded-full" />
            <div className="absolute inset-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-foreground">准备就绪</p>
        <p className="text-sm text-muted-foreground mt-2">输入提示词，开始创作歌词</p>
      </div>
    )
  }

  const currentTask = tasks[currentIndex]

  // Generating state - full screen loading
  if (currentTask?.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-amber-500/30 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-2 border-purple-500/30 rounded-full animate-ping" />
            <div className="absolute inset-2 border-2 border-pink-500/40 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-4 border-2 border-amber-500/50 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
            <Loader2 className="absolute inset-0 w-full h-full text-purple-400 animate-spin" />
          </div>
        </div>
        <p className="mt-8 text-lg font-medium text-foreground">正在创作歌词...</p>
        <p className="text-sm text-muted-foreground mt-2">
          任务 {currentIndex + 1} / {tasks.length}
        </p>
      </div>
    )
  }

  // Failed state
  if (currentTask?.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
          <div className="relative w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-foreground">生成失败</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
          {currentTask.error || '未知错误'}
        </p>
        <button
          onClick={() => onRetry(currentIndex)}
          className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  // Completed state - full screen lyrics display
  if (currentTask?.status === 'completed' && currentTask.result) {
    const handleCopy = async () => {
      if (!currentTask.result?.lyrics) return
      try {
        await navigator.clipboard.writeText(currentTask.result.lyrics)
        toastSuccess('歌词已复制到剪贴板')
      } catch {
        toastError('复制失败，请手动复制')
      }
    }

    return (
      <div className="h-full flex flex-col">
        {/* Lyrics content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            {currentTask.result.song_title && (
              <h2 className="text-2xl font-bold text-center mb-2 text-foreground">
                {currentTask.result.song_title}
              </h2>
            )}
            {currentTask.result.style_tags && (
              <div className="flex justify-center gap-2 mb-6">
                {(Array.isArray(currentTask.result.style_tags)
                  ? currentTask.result.style_tags
                  : currentTask.result.style_tags.split(',').map(s => s.trim())
                ).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {/* Lyrics box with action buttons in top-right corner */}
            <div className="relative bg-muted/30 rounded-xl p-6 group">
              {/* Action buttons - top right */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => currentTask.result && onEdit(currentTask.result)}
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
                  onClick={() => currentTask.result && onExport(currentTask.result)}
                  className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors"
                  title="导出"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground pt-2">
                {currentTask.result.lyrics}
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
