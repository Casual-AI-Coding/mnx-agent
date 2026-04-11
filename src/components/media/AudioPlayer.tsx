import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { MediaRecord } from '@/types/media'

interface AudioPlayerProps {
  record: MediaRecord
  signedUrl: string
  onClose: () => void
  playlist?: MediaRecord[]
  currentIndex?: number
  onPrev?: () => void
  onNext?: () => void
}

export function AudioPlayer({
  record,
  signedUrl,
  onClose,
  playlist,
  currentIndex,
  onPrev,
  onNext
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      if (onNext && playlist && currentIndex !== undefined && currentIndex < playlist.length - 1) {
        onNext()
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.volume = volume

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [isDragging, onNext, playlist, currentIndex])

  useEffect(() => {
    if (signedUrl && audioRef.current) {
      audioRef.current.src = signedUrl
      audioRef.current.load()
      setCurrentTime(0)
    }
  }, [signedUrl])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [isPlaying])

  const handleSeekStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    setCurrentTime(percent * duration)
  }, [duration])

  const handleSeekMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setCurrentTime(percent * duration)
  }, [isDragging, duration])

  const handleSeekEnd = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime
    }
    setIsDragging(false)
  }, [currentTime])

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setVolume(percent)
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => setIsMuted(!isMuted), [isMuted])

  const canGoPrev = currentIndex !== undefined && currentIndex > 0
  const canGoNext = currentIndex !== undefined && playlist && currentIndex < playlist.length - 1

  const formatTime = (t: number) => {
    if (!t || t < 0) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-lg rounded-lg p-3 w-[420px] max-w-[calc(100vw-32px)]">
      <audio ref={audioRef} preload="metadata" />

      <div className="flex items-center gap-2">
        {playlist && (
          <Button variant="ghost" size="icon" onClick={onPrev} disabled={!canGoPrev} className="h-8 w-8">
            <SkipBack className="w-4 h-4" />
          </Button>
        )}

        <Button onClick={togglePlay} className="h-9 w-9 rounded-full flex items-center justify-center">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>

        {playlist && (
          <Button variant="ghost" size="icon" onClick={onNext} disabled={!canGoNext} className="h-8 w-8">
            <SkipForward className="w-4 h-4" />
          </Button>
        )}

        <div className="flex-1 min-w-0 ml-2">
          <p className="text-sm font-medium truncate">{record.original_name || record.filename}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground w-10">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-2 bg-muted rounded-full cursor-pointer relative"
              onMouseDown={handleSeekStart}
              onMouseMove={handleSeekMove}
              onMouseUp={handleSeekEnd}
              onMouseLeave={() => isDragging && handleSeekEnd()}
            >
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <div
            className="w-16 h-2 bg-muted rounded-full cursor-pointer relative"
            onClick={handleVolumeChange}
          >
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {playlist && currentIndex !== undefined && (
        <div className="text-xs text-muted-foreground text-center mt-1">
          {currentIndex + 1} / {playlist.length}
        </div>
      )}
    </div>
  )
}
