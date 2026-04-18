// src/components/lyrics/LyricsTaskCarousel.tsx

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LyricsTaskCard } from './LyricsTaskCard'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

interface LyricsTaskCarouselProps {
  tasks: LyricsTask[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onRetry: (index: number) => void
  onEdit: (result: LyricsGenerationResponse) => void
  onExport: (result: LyricsGenerationResponse) => void
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
      <div className="text-center py-12 text-muted-foreground">
        点击"生成歌词"开始创作
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Navigation arrows */}
      {tasks.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
            onClick={() => onIndexChange(Math.min(tasks.length - 1, currentIndex + 1))}
            disabled={currentIndex === tasks.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Task cards */}
      <div className="overflow-hidden px-8">
        <div 
          className="flex transition-transform duration-200"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {tasks.map((task, index) => (
            <div key={task.id} className="w-full flex-shrink-0 px-2">
              <LyricsTaskCard
                task={task}
                index={index}
                onRetry={onRetry}
                onEdit={onEdit}
                onExport={onExport}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Status indicators */}
      {tasks.length > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                'w-2 h-2 rounded-full transition-colors cursor-pointer',
                index === currentIndex ? 'bg-primary' : 'bg-muted',
                task.status === 'completed' && 'bg-success',
                task.status === 'failed' && 'bg-destructive',
                task.status === 'generating' && 'bg-info animate-pulse'
              )}
              onClick={() => onIndexChange(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
