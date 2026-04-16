import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Music, Wand2 } from 'lucide-react'
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

  const isEmpty = tasks.length === 0

  return (
    <div 
      className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl shadow-primary/5 p-5 min-h-[320px]" 
      ref={containerRef} 
      tabIndex={-1}
    >
      {isEmpty ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-full min-h-[260px] text-center"
        >
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Music className="w-8 h-8 text-primary/60" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1 -right-1"
            >
              <Wand2 className="w-4 h-4 text-primary/40" />
            </motion.div>
          </div>
          
          <h3 className="text-base font-medium text-foreground/80 mb-2">
            等待生成音乐
          </h3>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            输入歌词和风格描述，点击生成按钮开始创作
          </p>
        </motion.div>
      ) : (
        <>
          <div className="relative">
            {tasks.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10",
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    "bg-card/95 backdrop-blur-sm border border-border/80",
                    "shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20",
                    "transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    currentIndex === 0 && "opacity-40 cursor-not-allowed hover:scale-100"
                  )}
                >
                  <ChevronLeft className="w-5 h-5 text-foreground/80" />
                </button>

                <button
                  onClick={goToNext}
                  disabled={currentIndex === tasks.length - 1}
                  className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10",
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    "bg-card/95 backdrop-blur-sm border border-border/80",
                    "shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20",
                    "transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    currentIndex === tasks.length - 1 && "opacity-40 cursor-not-allowed hover:scale-100"
                  )}
                >
                  <ChevronRight className="w-5 h-5 text-foreground/80" />
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
              className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-border/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground min-w-[2ch] tabular-nums text-center">
                  {currentIndex + 1}
                </span>
                <span className="text-muted-foreground/40 text-xs">/</span>
                <span className="text-sm font-medium text-muted-foreground min-w-[2ch] tabular-nums text-center">
                  {tasks.length}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {tasks.map((task, index) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setDirection(index > currentIndex ? 1 : -1)
                      onIndexChange(index)
                    }}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300 ease-out",
                      index === currentIndex 
                        ? "w-6 bg-primary shadow-sm shadow-primary/30" 
                        : "hover:scale-125",
                      task.status === 'completed' && index !== currentIndex && "bg-success/60",
                      task.status === 'generating' && index !== currentIndex && "bg-info/60 animate-pulse",
                      task.status === 'failed' && index !== currentIndex && "bg-error/60",
                      task.status === 'idle' && index !== currentIndex && "bg-muted-foreground/20 hover:bg-muted-foreground/40"
                    )}
                    aria-label={`跳转到任务 ${index + 1}`}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                {completedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {completedCount}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-error/10 text-error border border-error/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-error" />
                    {failedCount}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}