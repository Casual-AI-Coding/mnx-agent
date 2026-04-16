import { motion } from 'framer-motion'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Music,
  Heart,
  Globe,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import { Badge } from '@/components/ui/Badge'
import { toastSuccess, toastError } from '@/lib/toast'

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

interface AudioPlayerProps {
  audioUrl: string
  duration?: number
  title?: string
  mediaId?: string
  isFavorite?: boolean
  isPublic?: boolean
  onDownload?: () => void
  onDelete?: () => void
  onFavorite?: () => void
  onTogglePublic?: () => void
}

function AudioPlayer({
  audioUrl,
  duration,
  title,
  mediaId,
  isFavorite,
  isPublic,
  onDownload,
  onDelete,
  onFavorite,
  onTogglePublic,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [volume, setVolume] = useState(0.25)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [isTogglingPublic, setIsTogglingPublic] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const canPerformMediaActions = mediaId && (onDelete || onFavorite || onTogglePublic)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => setIsPlaying(false)
    const handleLoadedMetadata = () => {
      if (audio.duration && !isFinite(audio.duration)) {
        audio.currentTime = 0
      }
    }

    audio.volume = volume
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [volume])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const totalDuration = audioRef.current?.duration || duration || 0

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * totalDuration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !progressRef.current || !audioRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percent * totalDuration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current || !audioRef.current) return
    const rect = volumeRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setVolume(percent)
    setIsMuted(false)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-4 h-4" />
    if (volume < 0.5) return <Volume1 className="w-4 h-4" />
    return <Volume2 className="w-4 h-4" />
  }

  const handleDeleteClick = useCallback(async () => {
    if (!onDelete) return
    if (!window.confirm('确定要删除这首音乐吗？删除后无法恢复。')) return
    setIsDeleting(true)
    try {
      await onDelete()
      toastSuccess('音乐已删除')
    } catch (err) {
      toastError('删除失败', err instanceof Error ? err.message : '请稍后重试')
    } finally {
      setIsDeleting(false)
    }
  }, [onDelete])

  const handleFavoriteClick = useCallback(async () => {
    if (!onFavorite) return
    setIsFavoriting(true)
    try {
      await onFavorite()
      toastSuccess(isFavorite ? '已取消收藏' : '已添加收藏')
    } catch (err) {
      toastError('收藏操作失败', err instanceof Error ? err.message : '请稍后重试')
    } finally {
      setIsFavoriting(false)
    }
  }, [onFavorite, isFavorite])

  const handleTogglePublicClick = useCallback(async () => {
    if (!onTogglePublic) return
    setIsTogglingPublic(true)
    try {
      await onTogglePublic()
      toastSuccess(isPublic ? '已取消公开' : '已设为公开')
    } catch (err) {
      toastError('公开设置失败', err instanceof Error ? err.message : '请稍后重试')
    } finally {
      setIsTogglingPublic(false)
    }
  }, [onTogglePublic, isPublic])

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-dark-800/90 to-dark-900',
        'border border-border/40',
        'shadow-lg shadow-black/30'
      )}>
        <div className="px-4 pt-4 pb-3 border-b border-border/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Music className="w-4 h-4 text-primary/70 shrink-0" />
              <span className="text-sm font-medium text-foreground/90 truncate">
                {title || '未命名音乐'}
              </span>
              {mediaId && (
                <span className="text-xs text-muted-foreground/50 font-mono">
                  #{mediaId.slice(0, 8)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                onClick={toggleMute}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                {getVolumeIcon()}
              </motion.button>
              
              <div 
                ref={volumeRef}
                className="w-20 h-1.5 rounded-full bg-dark-600/70 cursor-pointer relative group"
                onClick={handleVolumeClick}
              >
                <div 
                  className="absolute top-0 left-0 h-full rounded-full bg-primary/60 transition-all duration-150 group-hover:bg-primary/80"
                  style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                />
                <div 
                  className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${isMuted ? 0 : volume * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={togglePlay}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                'bg-primary hover:bg-primary/90 transition-all duration-200',
                'shadow-lg shadow-primary/30',
                'border-0'
              )}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
              )}
            </motion.button>
            
            <div className="flex-1 min-w-0">
              <div 
                ref={progressRef}
                className="h-2 rounded-full bg-dark-600/70 cursor-pointer relative group"
                onClick={handleProgressClick}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleProgressDrag}
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
                <span className="text-muted-foreground font-mono">
                  {formatDuration(currentTime)}
                </span>
                <span className="text-muted-foreground/60 font-mono">
                  {formatDuration(totalDuration)}
                </span>
              </div>
            </div>
            
            {canPerformMediaActions && (
              <div className="flex items-center gap-1.5 shrink-0">
                {onFavorite && (
                  <motion.button
                    onClick={handleFavoriteClick}
                    disabled={isFavoriting}
                    whileHover={{ scale: isFavoriting ? 1 : 1.1 }}
                    whileTap={{ scale: isFavoriting ? 1 : 0.9 }}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200',
                      isFavorite 
                        ? 'bg-error/20 text-error border border-error/30' 
                        : 'bg-white/5 text-muted-foreground hover:text-error hover:bg-error/10 border border-white/10',
                      isFavoriting && 'opacity-50 cursor-wait'
                    )}
                    title={isFavorite ? '取消收藏' : '收藏'}
                  >
                    <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
                  </motion.button>
                )}
                
                {onTogglePublic && (
                  <motion.button
                    onClick={handleTogglePublicClick}
                    disabled={isTogglingPublic}
                    whileHover={{ scale: isTogglingPublic ? 1 : 1.1 }}
                    whileTap={{ scale: isTogglingPublic ? 1 : 0.9 }}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200',
                      isPublic 
                        ? 'bg-success/20 text-success border border-success/30' 
                        : 'bg-white/5 text-muted-foreground hover:text-success hover:bg-success/10 border border-white/10',
                      isTogglingPublic && 'opacity-50 cursor-wait'
                    )}
                    title={isPublic ? '取消公开' : '公开'}
                  >
                    <Globe className="w-4 h-4" />
                  </motion.button>
                )}
                
                {onDelete && (
                  <motion.button
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    whileHover={{ scale: isDeleting ? 1 : 1.1 }}
                    whileTap={{ scale: isDeleting ? 1 : 0.9 }}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      'bg-white/5 text-muted-foreground hover:text-error hover:bg-error/10 border border-white/10',
                      'transition-all duration-200',
                      isDeleting && 'opacity-50 cursor-wait'
                    )}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
                
                {onDownload && (
                  <motion.button
                    onClick={onDownload}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      'bg-white/5 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-white/10',
                      'transition-all duration-200'
                    )}
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            )}
            
            {!canPerformMediaActions && onDownload && (
              <motion.button
                onClick={onDownload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  'bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40',
                  'text-muted-foreground hover:text-primary',
                  'transition-all duration-200'
                )}
                title="下载音乐"
              >
                <Download className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
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
      layout
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
              <div className={cn('flex flex-col items-center justify-center py-8 gap-4', statusTokens.info.text)}>
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-blue-500/10"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">正在生成音乐</p>
                  <p className="text-xs text-muted-foreground">请稍候...</p>
                </div>
              </div>
            )}

            {task.status === 'completed' && task.audioUrl && (
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

            {task.status === 'failed' && task.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 py-2"
              >
                <div className={cn('flex flex-col items-center gap-3 p-4 rounded-xl', statusTokens.error.bgSubtle, statusTokens.error.border)}>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle className={cn('w-6 h-6', statusTokens.error.icon)} />
                  </div>
                  <p className={cn('text-sm text-center', statusTokens.error.text)}>{task.error}</p>
                </div>
                
                <motion.button
                  onClick={() => onRetry(index)}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium border border-input bg-background px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4" />
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