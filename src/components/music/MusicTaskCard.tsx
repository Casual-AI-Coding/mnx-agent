import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AudioPlayer } from './task-card/AudioPlayer.js'
import { DeletedState, FailedState, GeneratingState, getProgressColor, TaskStatusMeta } from './task-card/TaskCardStates.js'

export type MusicTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface MusicTask {
  id: string
  status: MusicTaskStatus
  progress: number
  audioUrl?: string
  audioDuration?: number
  error?: string
  retryCount: number
  mediaId?: string
  mediaTitle?: string
  isFavorite?: boolean
  isPublic?: boolean
  isDeleted?: boolean
}

interface MusicTaskCardProps {
  task: MusicTask
  index: number
  onRetry: (index: number) => void
  onDownload: (audioUrl: string, filename: string) => void
  onDelete?: (mediaId: string) => void
  onFavorite?: (mediaId: string) => void
  onTogglePublic?: (mediaId: string, isPublic: boolean) => void
}

const taskVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    },
  },
}

export function MusicTaskCard({ 
  task, 
  index, 
  onRetry, 
  onDownload,
  onDelete,
  onFavorite,
  onTogglePublic 
}: MusicTaskCardProps) {
  return (
    <motion.div
      variants={taskVariants}
      initial="hidden"
      animate="visible"
      className="group"
    >
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
        <div
          className={cn(
            "relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden min-h-[200px]",
            task.status === 'generating' && "bg-gradient-to-br from-blue-500/5 to-purple-500/5",
            task.status === 'completed' && "bg-gradient-to-br from-green-500/5 to-emerald-500/5",
            task.status === 'failed' && "bg-gradient-to-br from-red-500/5 to-orange-500/5",
          )}
        >
          <div
            className={cn(
              `absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${getProgressColor(task.status)} transition-all duration-500`,
              task.status === 'generating' && "shadow-lg shadow-blue-500/50"
            )}
            style={{ width: `${task.progress}%` }}
          />

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <TaskStatusMeta index={index} retryCount={task.retryCount} status={task.status} />
            </div>

            {task.status === 'generating' && (
              <GeneratingState />
            )}

            {task.status === 'completed' && task.audioUrl && !task.isDeleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AudioPlayer 
                  audioUrl={task.audioUrl} 
                  duration={task.audioDuration}
                  title={task.mediaTitle || `音乐 ${index + 1}`}
                  mediaId={task.mediaId}
                  isFavorite={task.isFavorite}
                  isPublic={task.isPublic}
                  onDownload={() => onDownload(task.audioUrl!, task.mediaTitle || `music-${task.id}.mp3`)}
                  onDelete={task.mediaId && onDelete ? () => onDelete(task.mediaId!) : undefined}
                  onFavorite={task.mediaId && onFavorite ? () => onFavorite(task.mediaId!) : undefined}
                  onTogglePublic={task.mediaId && onTogglePublic ? () => onTogglePublic(task.mediaId!, !task.isPublic) : undefined}
                />
              </motion.div>
            )}

            {task.status === 'completed' && task.isDeleted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><DeletedState /></motion.div>
            )}

            {task.status === 'failed' && task.error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <FailedState error={task.error} onRetry={() => onRetry(index)} retryCount={task.retryCount} />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
