import { motion } from 'framer-motion'
import { Music, Volume1, Volume2, VolumeX } from 'lucide-react'
import { ActionButtons } from './ActionButtons.js'
import { PlayControls } from './PlayControls.js'

interface AudioPlayerViewProps {
  canPerformMediaActions: boolean
  currentTimeLabel: string
  isDeleting: boolean
  isFavorite?: boolean
  isFavoriting: boolean
  isMuted: boolean
  isPlaying: boolean
  isPublic?: boolean
  isTogglingPublic: boolean
  mediaId?: string
  onDelete?: () => void
  onDownload?: () => void
  onFavorite?: () => void
  onMouseDown: () => void
  onMouseLeave: () => void
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void
  onMouseUp: () => void
  onProgressClick: (event: React.MouseEvent<HTMLDivElement>) => void
  onToggleMute: () => void
  onTogglePlay: () => void
  onTogglePublic?: () => void
  onVolumeClick: (event: React.MouseEvent<HTMLDivElement>) => void
  progressPercent: number
  progressRef: React.RefObject<HTMLDivElement>
  title?: string
  totalDurationLabel: string
  volume: number
  volumeRef: React.RefObject<HTMLDivElement>
}

function getVolumeIcon(isMuted: boolean, volume: number) {
  if (isMuted || volume === 0) return <VolumeX className="w-4 h-4" />
  if (volume < 0.5) return <Volume1 className="w-4 h-4" />
  return <Volume2 className="w-4 h-4" />
}

export function AudioPlayerView({
  canPerformMediaActions,
  currentTimeLabel,
  isDeleting,
  isFavorite,
  isFavoriting,
  isMuted,
  isPlaying,
  isPublic,
  isTogglingPublic,
  mediaId,
  onDelete,
  onDownload,
  onFavorite,
  onMouseDown,
  onMouseLeave,
  onMouseMove,
  onMouseUp,
  onProgressClick,
  onToggleMute,
  onTogglePlay,
  onTogglePublic,
  onVolumeClick,
  progressPercent,
  progressRef,
  title,
  totalDurationLabel,
  volume,
  volumeRef,
}: AudioPlayerViewProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-dark-800/90 to-dark-900 border border-border/40 shadow-lg shadow-black/30">
      <div className="px-4 pt-4 pb-3 border-b border-border/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Music className="w-4 h-4 text-primary/70 shrink-0" />
            <span className="text-sm font-medium text-foreground/90 truncate">{title || '未命名音乐'}</span>
            {mediaId && <span className="text-xs text-muted-foreground/50 font-mono">#{mediaId.slice(0, 8)}</span>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              onClick={onToggleMute}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {getVolumeIcon(isMuted, volume)}
            </motion.button>

            <div ref={volumeRef} className="w-20 h-1.5 rounded-full bg-dark-600/70 cursor-pointer relative group" onClick={onVolumeClick}>
              <div className="absolute top-0 left-0 h-full rounded-full bg-primary/60 transition-all duration-150 group-hover:bg-primary/80" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
              <div className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${isMuted ? 0 : volume * 100}%`, transform: 'translate(-50%, -50%)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <PlayControls
            currentTimeLabel={currentTimeLabel}
            isPlaying={isPlaying}
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onProgressClick={onProgressClick}
            onTogglePlay={onTogglePlay}
            progressPercent={progressPercent}
            progressRef={progressRef}
            totalDurationLabel={totalDurationLabel}
          />
        </div>

        <ActionButtons
          canPerformMediaActions={canPerformMediaActions}
          isDeleting={isDeleting}
          isFavorite={isFavorite}
          isFavoriting={isFavoriting}
          isPublic={isPublic}
          isTogglingPublic={isTogglingPublic}
          onDelete={onDelete}
          onDownload={onDownload}
          onFavorite={onFavorite}
          onTogglePublic={onTogglePublic}
        />
      </div>
    </div>
  )
}
