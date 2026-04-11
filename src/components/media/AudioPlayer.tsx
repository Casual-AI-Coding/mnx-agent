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
  const [showVolume, setShowVolume] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (!isDragging) setCurrentTime(audio.currentTime)
    }
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      if (onNext && playlist && currentIndex !== undefined && currentIndex < playlist.length - 1) onNext()
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
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolume(false)
      }
    }
    if (showVolume) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVolume])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play().catch(() => setIsPlaying(false))
  }, [isPlaying])

  const handleSeekStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setCurrentTime((e.clientX - rect.left) / rect.width * duration)
  }, [duration])

  const handleSeekMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    setCurrentTime(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration)
  }, [isDragging, duration])

  const handleSeekEnd = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = currentTime
    setIsDragging(false)
  }, [currentTime])

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-popover border shadow-xl rounded-xl p-3 w-[300px]">
      <audio ref={audioRef} preload="metadata" />

      {/* Row 1: Controls + Title + Volume + Close */}
      <div className="flex items-center gap-1.5 mb-2">
        <Button variant="ghost" size="icon" onClick={onPrev} disabled={!canGoPrev} className="h-7 w-7">
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button onClick={togglePlay} className="h-9 w-9 rounded-full">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={!canGoNext} className="h-7 w-7">
          <SkipForward className="w-4 h-4" />
        </Button>

        <span className="text-xs font-medium truncate flex-1 ml-1" title={record.original_name || record.filename}>
          {record.original_name || record.filename}
        </span>

        <div className="relative" ref={volumeRef}>
          <Button variant="ghost" size="icon" onClick={() => setShowVolume(!showVolume)} className="h-7 w-7">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          {showVolume && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover border rounded-lg shadow-lg"
              onClick={handleVolumeChange}
            >
              <div className="w-20 h-1.5 bg-muted rounded-full cursor-pointer">
                <div className="h-full bg-primary rounded-full" style={{ width: `${volume * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Row 2: Progress + Counter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-7 text-right">{formatTime(currentTime)}</span>
        <div
          className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer"
          onMouseDown={handleSeekStart}
          onMouseMove={handleSeekMove}
          onMouseUp={handleSeekEnd}
          onMouseLeave={() => isDragging && handleSeekEnd()}
        >
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground w-7">{formatTime(duration)}</span>
        {playlist && currentIndex !== undefined && (
          <span className="text-[10px] text-muted-foreground ml-1">{currentIndex + 1}/{playlist.length}</span>
        )}
      </div>
    </div>
  )
}
