import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toastError, toastSuccess } from '@/lib/toast'
import { AudioPlayerView } from './AudioPlayerView.js'

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export interface AudioPlayerProps {
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

export function AudioPlayer({
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    const newTime = percent * totalDuration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleProgressDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !progressRef.current || !audioRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const newTime = percent * totalDuration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current || !audioRef.current) return
    const rect = volumeRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    setVolume(percent)
    setIsMuted(false)
  }

  const handleConfirmDelete = useCallback(async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
      toastSuccess('音乐已删除')
      setShowDeleteConfirm(false)
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
  }, [isFavorite, onFavorite])

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
  }, [isPublic, onTogglePublic])

  return (
    <div className="min-h-[130px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <AudioPlayerView
        canPerformMediaActions={Boolean(canPerformMediaActions)}
        currentTimeLabel={formatDuration(currentTime)}
        isDeleting={isDeleting}
        isFavorite={isFavorite}
        isFavoriting={isFavoriting}
        isMuted={isMuted}
        isPlaying={isPlaying}
        isPublic={isPublic}
        isTogglingPublic={isTogglingPublic}
        mediaId={mediaId}
        onDelete={onDelete ? () => setShowDeleteConfirm(true) : undefined}
        onDownload={onDownload}
        onFavorite={onFavorite ? handleFavoriteClick : undefined}
        onMouseDown={() => setIsDragging(true)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleProgressDrag}
        onMouseUp={() => setIsDragging(false)}
        onProgressClick={handleProgressClick}
        onToggleMute={() => setIsMuted(!isMuted)}
        onTogglePlay={togglePlay}
        onTogglePublic={onTogglePublic ? handleTogglePublicClick : undefined}
        onVolumeClick={handleVolumeClick}
        progressPercent={progressPercent}
        progressRef={progressRef}
        title={title}
        totalDurationLabel={formatDuration(totalDuration)}
        volume={volume}
        volumeRef={volumeRef}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="删除音乐"
        description="确定要删除这首音乐吗？删除后无法恢复。"
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        loading={isDeleting}
        size="sm"
      />
    </div>
  )
}
