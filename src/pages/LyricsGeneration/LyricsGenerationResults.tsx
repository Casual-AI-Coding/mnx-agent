import { FileText, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LyricsTaskCarousel } from '@/components/lyrics/LyricsTaskCarousel'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

interface LyricsGenerationResultsProps {
  tasks: LyricsTask[]
  currentIndex: number
  isGenerating: boolean
  onIndexChange: (idx: number) => void
  onRetry: (idx: number) => void
  onEdit: (result: LyricsGenerationResponse) => void
  onExport: (result: LyricsGenerationResponse) => void
  t: (key: string) => string
}

export function LyricsGenerationResults({
  tasks,
  currentIndex,
  isGenerating,
  onIndexChange,
  onRetry,
  onEdit,
  onExport,
  t,
}: LyricsGenerationResultsProps) {
  return (
    <div className="xl:col-span-7 xl:sticky xl:top-6">
      <div className="relative h-full">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/20 rounded-2xl blur opacity-50" />
        <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl h-full xl:max-h-[650px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-foreground" />
              <span className="text-sm font-medium text-foreground">{t('lyrics.result')}</span>
            </div>
            {tasks.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    currentIndex === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
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
                        idx === currentIndex && task.status === 'generating' && "ring-[3px] ring-blue-500 bg-blue-500/20 text-blue-500 font-bold",
                        idx === currentIndex && task.status === 'completed' && "ring-[3px] ring-green-500 bg-green-500/20 text-green-600 font-bold",
                        idx === currentIndex && task.status === 'failed' && "ring-[3px] ring-red-500 bg-red-500/20 text-red-600 font-bold",
                        idx !== currentIndex && task.status === 'generating' && "bg-blue-500/20 text-blue-500 animate-pulse font-medium",
                        idx !== currentIndex && task.status === 'completed' && "bg-green-500/20 text-green-600 font-medium",
                        idx !== currentIndex && task.status === 'failed' && "bg-red-500/20 text-red-600 font-medium"
                      )}
                    >
                      {task.status === 'generating' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
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
                    currentIndex === tasks.length - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4">
            <LyricsTaskCarousel
              tasks={tasks}
              currentIndex={currentIndex}
              onIndexChange={onIndexChange}
              onRetry={onRetry}
              onEdit={onEdit}
              onExport={onExport}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
