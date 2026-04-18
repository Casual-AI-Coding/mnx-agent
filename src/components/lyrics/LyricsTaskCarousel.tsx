// src/components/lyrics/LyricsTaskCarousel.tsx

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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

  // Generating state - full screen loading like ImageGeneration
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
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className={cn(
              "p-2 rounded-full transition-colors bg-muted/50",
              currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {tasks.map((task, idx) => (
              <button
                key={task.id}
                onClick={() => onIndexChange(idx)}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all",
                  idx === currentIndex && task.status === 'generating' && "ring-[3px] ring-purple-500 bg-purple-500/20 text-purple-500 font-bold",
                  idx === currentIndex && task.status === 'completed' && "ring-[3px] ring-green-500 bg-green-500/20 text-green-600 font-bold",
                  idx === currentIndex && task.status === 'failed' && "ring-[3px] ring-red-500 bg-red-500/20 text-red-600 font-bold",
                  idx !== currentIndex && task.status === 'generating' && "bg-purple-500/20 text-purple-500 animate-pulse font-medium",
                  idx !== currentIndex && task.status === 'completed' && "bg-green-500/20 text-green-600 font-medium",
                  idx !== currentIndex && task.status === 'failed' && "bg-red-500/20 text-red-600 font-medium"
                )}
              >
                {task.status === 'generating' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : task.status === 'failed' ? (
                  <X className="w-3 h-3" />
                ) : (
                  <CheckCircle className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => onIndexChange(Math.min(tasks.length - 1, currentIndex + 1))}
            disabled={currentIndex === tasks.length - 1}
            className={cn(
              "p-2 rounded-full transition-colors bg-muted/50",
              currentIndex === tasks.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className={cn(
              "p-2 rounded-full transition-colors bg-muted/50",
              currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {tasks.map((task, idx) => (
              <button
                key={task.id}
                onClick={() => onIndexChange(idx)}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all",
                  idx === currentIndex && task.status === 'failed' && "ring-[3px] ring-red-500 bg-red-500/20 text-red-600 font-bold",
                  idx !== currentIndex && task.status === 'completed' && "bg-green-500/20 text-green-600 font-medium",
                  idx !== currentIndex && task.status === 'failed' && "bg-red-500/20 text-red-600 font-medium"
                )}
              >
                {task.status === 'failed' ? (
                  <X className="w-3 h-3" />
                ) : task.status === 'completed' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  idx + 1
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => onIndexChange(Math.min(tasks.length - 1, currentIndex + 1))}
            disabled={currentIndex === tasks.length - 1}
            className={cn(
              "p-2 rounded-full transition-colors bg-muted/50",
              currentIndex === tasks.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Completed state - full screen lyrics display
  if (currentTask?.status === 'completed' && currentTask.result) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with navigation and actions */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className={cn(
                "p-1 rounded-md transition-colors",
                currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {tasks.map((task, idx) => (
                <button
                  key={task.id}
                  onClick={() => onIndexChange(idx)}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all",
                    idx === currentIndex && task.status === 'completed' && "ring-[3px] ring-green-500 bg-green-500/20 text-green-600 font-bold",
                    idx === currentIndex && task.status === 'failed' && "ring-[3px] ring-red-500 bg-red-500/20 text-red-600 font-bold",
                    idx !== currentIndex && task.status === 'completed' && "bg-green-500/20 text-green-600 font-medium",
                    idx !== currentIndex && task.status === 'failed' && "bg-red-500/20 text-red-600 font-medium"
                  )}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : task.status === 'failed' ? (
                    <X className="w-3 h-3" />
                  ) : (
                    idx + 1
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => onIndexChange(Math.min(tasks.length - 1, currentIndex + 1))}
              disabled={currentIndex === tasks.length - 1}
              className={cn(
                "p-1 rounded-md transition-colors",
                currentIndex === tasks.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => currentTask.result && onEdit(currentTask.result)}
              className="px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              编辑
            </button>
            <button
              onClick={() => currentTask.result && onExport(currentTask.result)}
              className="px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              导出
            </button>
          </div>
        </div>

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
                  : [currentTask.result.style_tags]
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
            <div className="bg-muted/30 rounded-xl p-6">
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground">
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
