import { motion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayControlsProps {
  currentTimeLabel: string
  isPlaying: boolean
  onMouseDown: () => void
  onMouseLeave: () => void
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void
  onMouseUp: () => void
  onProgressClick: (event: React.MouseEvent<HTMLDivElement>) => void
  onTogglePlay: () => void
  progressPercent: number
  progressRef: React.RefObject<HTMLDivElement>
  totalDurationLabel: string
}

export function PlayControls({
  currentTimeLabel,
  isPlaying,
  onMouseDown,
  onMouseLeave,
  onMouseMove,
  onMouseUp,
  onProgressClick,
  onTogglePlay,
  progressPercent,
  progressRef,
  totalDurationLabel,
}: PlayControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <motion.button
        onClick={onTogglePlay}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
          'bg-primary hover:bg-primary/90 transition-all duration-200',
          'shadow-lg shadow-primary/30 border-0'
        )}
      >
        {isPlaying ? <Pause className="w-5 h-5 text-primary-foreground" /> : <Play className="w-5 h-5 text-primary-foreground ml-0.5" />}
      </motion.button>

      <div className="flex-1 min-w-0">
        <div
          ref={progressRef}
          className="h-2 rounded-full bg-dark-600/70 cursor-pointer relative group"
          onClick={onProgressClick}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onMouseMove={onMouseMove}
        >
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/70 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
            style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-muted-foreground font-mono">{currentTimeLabel}</span>
          <span className="text-muted-foreground/60 font-mono">{totalDurationLabel}</span>
        </div>
      </div>
    </div>
  )
}
