import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MusicTaskCard } from './MusicTaskCard'
import type { MusicTask } from './MusicTaskCard'

export type { MusicTask }

interface MusicCarouselProps {
  tasks: MusicTask[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onRetry: (index: number) => void
  onDownload: (audioUrl: string, filename: string) => void
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

export function MusicCarousel({ 
  tasks, 
  currentIndex, 
  onIndexChange, 
  onRetry, 
  onDownload 
}: MusicCarouselProps) {
  const [direction, setDirection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audioElements = containerRef.current?.querySelectorAll('audio')
    if (audioElements && audioElements.length > 0) {
      audioRef.current = audioElements[0] as HTMLAudioElement
    }
  }, [currentIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tasks.length <= 1) return
      if (!containerRef.current?.contains(document.activeElement)) return
      
      if (e.key === 'ArrowLeft') {
        setDirection(-1)
        onIndexChange(Math.max(0, currentIndex - 1))
      } else if (e.key === 'ArrowRight') {
        setDirection(1)
        onIndexChange(Math.min(tasks.length - 1, currentIndex + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, tasks.length, onIndexChange])

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      onIndexChange(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < tasks.length - 1) {
      setDirection(1)
      onIndexChange(currentIndex + 1)
    }
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const failedCount = tasks.filter(t => t.status === 'failed').length

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="space-y-4" ref={containerRef} tabIndex={-1}>
      <div className="relative">
        {tasks.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10",
                "p-2 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors",
                currentIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            
            <button
              onClick={goToNext}
              disabled={currentIndex === tasks.length - 1}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10",
                "p-2 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors",
                currentIndex === tasks.length - 1 && "opacity-50 cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            <MusicTaskCard
              task={tasks[currentIndex]}
              index={currentIndex}
              onRetry={onRetry}
              onDownload={onDownload}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {tasks.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2"
        >
          <span className="text-sm text-muted-foreground mr-2">
            [{currentIndex + 1}/{tasks.length}]
          </span>
          
          <div className="flex items-center gap-1">
            {tasks.map((task, index) => (
              <button
                key={task.id}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1)
                  onIndexChange(index)
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex && "w-3 h-3",
                  task.status === 'completed' && "bg-success",
                  task.status === 'generating' && "bg-info animate-pulse",
                  task.status === 'failed' && "bg-error",
                  task.status === 'idle' && "bg-muted-foreground/30"
                )}
                aria-label={`跳转到任务 ${index + 1}`}
              />
            ))}
          </div>
          
          {completedCount > 0 && (
            <span className="text-xs text-success ml-2">
              {completedCount} 完成
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-xs text-error ml-2">
              {failedCount} 失败
            </span>
          )}
        </motion.div>
      )}
    </div>
  )
}