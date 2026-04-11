import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react'
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
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
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
      setDuration(0)
    }
  }, [signedUrl])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [isPlaying])

  const handleSeekInput = useCallback((value: number) => {
    setIsDragging(true)
    setDragValue(value)
    setCurrentTime(value)
  }, [])

  const handleSeekCommit = useCallback((value: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = value
    }
    setIsDragging(false)
    setCurrentTime(value)
  }, [])

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value)
  }, [])

  const canGoPrev = currentIndex !== undefined && currentIndex > 0
  const canGoNext = currentIndex !== undefined && playlist && currentIndex < playlist.length - 1

  const formatTime = useCallback((time: number) => {
    if (!time || time < 0 || !Number.isFinite(time)) return '0:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 to-black/80 backdrop-blur-xl border-t border-white/10">
      <audio ref={audioRef} preload="metadata" />

      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center gap-6">
          {playlist && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              disabled={!canGoPrev}
              className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 h-10 w-10"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
          )}

          <Button
            onClick={togglePlay}
            className="h-14 w-14 rounded-full bg-white text-black hover:bg-white/90 shadow-lg flex items-center justify-center"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>

          {playlist && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!canGoNext}
              className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 h-10 w-10"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate mb-2">
              {record.original_name || record.filename}
            </p>

            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm w-12 text-right font-mono">
                {formatTime(currentTime)}
              </span>

              <div
                className="flex-1 h-1.5 bg-white/20 rounded-full relative cursor-pointer group"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = (e.clientX - rect.left) / rect.width
                  const time = percent * duration
                  handleSeekInput(time)
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  const time = percent * duration
                  handleSeekInput(time)
                }}
                onMouseUp={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  const time = percent * duration
                  handleSeekCommit(time)
                }}
                onMouseLeave={() => {
                  if (isDragging) {
                    handleSeekCommit(dragValue)
                  }
                }}
              >
                <div
                  className="absolute left-0 top-0 h-full bg-white rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progressPercent}%`, marginLeft: -6 }}
                />
              </div>

              <span className="text-white/60 text-sm w-12 font-mono">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-24">
            <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.7 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <div
              className="flex-1 h-1 bg-white/20 rounded-full relative cursor-pointer"
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                handleVolumeChange(Math.max(0, Math.min(1, percent)))
              }}
              onMouseMove={(e) => {
                if (e.buttons !== 1) return
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                handleVolumeChange(percent)
              }}
            >
              <div
                className="absolute left-0 top-0 h-full bg-white/60 rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {playlist && currentIndex !== undefined && (
          <div className="text-white/40 text-xs text-center mt-2">
            {currentIndex + 1} / {playlist.length}
          </div>
        )}
      </div>
    </div>
  )
}