import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status as statusTokens, services } from '@/themes/tokens'
import { Badge } from '@/components/ui/Badge'

export type MusicTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface MusicTask {
  id: string
  status: MusicTaskStatus
  progress: number
  audioUrl?: string
  audioDuration?: number
  error?: string
  retryCount: number
}

interface MusicTaskCardProps {
  task: MusicTask
  index: number
  onRetry: (index: number) => void
  onDownload: (audioUrl: string, filename: string) => void
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

function getStatusIcon(status: MusicTaskStatus) {
  switch (status) {
    case 'idle':
      return (
        <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
        </div>
      )
    case 'generating':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.info.bgSubtle)}>
          <Loader2 className={cn('w-4 h-4 animate-spin', statusTokens.info.icon)} />
        </div>
      )
    case 'completed':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.success.bgSubtle)}>
          <CheckCircle className={cn('w-4 h-4', statusTokens.success.icon)} />
        </div>
      )
    case 'failed':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.error.bgSubtle)}>
          <XCircle className={cn('w-4 h-4', statusTokens.error.icon)} />
        </div>
      )
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
        </div>
      )
  }
}

function getStatusBadge(status: MusicTaskStatus) {
  switch (status) {
    case 'idle':
      return (
        <Badge className="bg-muted/10 text-foreground border-muted/20">
          待生成
        </Badge>
      )
    case 'generating':
      return (
        <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border, 'hover:bg-info/20')}>
          生成中
        </Badge>
      )
    case 'completed':
      return (
        <Badge className={cn(statusTokens.success.bgSubtle, statusTokens.success.text, statusTokens.success.border, 'hover:bg-success/20')}>
          已完成
        </Badge>
      )
    case 'failed':
      return (
        <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border, 'hover:bg-error/20')}>
          失败
        </Badge>
      )
    default:
      return (
        <Badge className="bg-muted/10 text-foreground border-muted/20">
          未知
        </Badge>
      )
  }
}

function getProgressColor(status: MusicTaskStatus) {
  switch (status) {
    case 'generating':
      return statusTokens.info.gradient
    case 'completed':
      return statusTokens.success.gradient
    case 'failed':
      return statusTokens.error.gradient
    default:
      return 'from-muted/40 to-muted-foreground/70/40'
  }
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function MusicTaskCard({ task, index, onRetry, onDownload }: MusicTaskCardProps) {
  return (
    <motion.div
      variants={taskVariants}
      initial="hidden"
      animate="visible"
      layout
      className="group"
    >
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
        <div
          className={cn(
            "relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden",
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
              <div className="flex items-center gap-3">
                {getStatusIcon(task.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground">
                      #{index + 1}
                    </span>
                    {getStatusBadge(task.status)}
                  </div>
                  {task.retryCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      已重试 {task.retryCount} 次
                    </p>
                  )}
                </div>
              </div>
            </div>

            {task.status === 'generating' && (
              <div className={cn('flex items-center gap-2 text-xs', statusTokens.info.text)}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>正在生成音乐，请稍候...</span>
              </div>
            )}

            {task.status === 'completed' && task.audioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={cn('relative rounded-lg p-3', services.music.bg)}>
                  <audio
                    key={task.audioUrl}
                    src={task.audioUrl}
                    controls
                    preload="metadata"
                    className="w-full"
                  />
                  {task.audioDuration && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Volume2 className="w-4 h-4" />
                      时长: {formatDuration(task.audioDuration)}
                    </div>
                  )}
                </div>
                
                <motion.button
                  onClick={() => onDownload(task.audioUrl!, `music-${task.id}.mp3`)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors',
                    'border px-4 py-2',
                    services.music.bg, services.music.text, 'hover:opacity-80'
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载音乐
                </motion.button>
              </motion.div>
            )}

            {task.status === 'failed' && task.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className={cn('flex items-center gap-2 p-3 rounded-lg', statusTokens.error.bgSubtle, statusTokens.error.border)}>
                  <XCircle className={cn('w-4 h-4 shrink-0', statusTokens.error.icon)} />
                  <p className={cn('text-sm', statusTokens.error.text)}>{task.error}</p>
                </div>
                
                <motion.button
                  onClick={() => onRetry(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-input bg-background px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重试生成
                </motion.button>
                
                {task.retryCount >= 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    已多次重试失败，建议检查参数或稍后重试
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}