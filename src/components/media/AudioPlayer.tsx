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
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekTarget, setSeekTarget] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setCurrentTime(0)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      if (onNext && playlist && currentIndex !== undefined && currentIndex < playlist.length - 1) {
        onNext()
      }
    }

    const handleSeeked = () => {
      setCurrentTime(audio.currentTime)
      setIsSeeking(false)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('seeked', handleSeeked)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('seeked', handleSeeked)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [isSeeking, onNext, playlist, currentIndex])

  useEffect(() => {
    if (signedUrl && audioRef.current) {
      const audio = audioRef.current
      audio.src = signedUrl
      audio.load()
      setCurrentTime(0)
      setIsSeeking(false)
      setSeekTarget(0)
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
      audio.play().catch(() => {
        setIsPlaying(false)
      })
    }
  }, [isPlaying])

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setSeekTarget(time)
    setCurrentTime(time)
  }, [])

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true)
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
    }
  }, [isPlaying])

  const handleSeekEnd = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = seekTarget

    if (isPlaying) {
      audio.play().catch(() => {})
    }
  }, [seekTarget, isPlaying])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (vol > 0) setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const canGoPrev = currentIndex !== undefined && currentIndex > 0
  const canGoNext = currentIndex !== undefined && playlist && currentIndex < playlist.length - 1

  const formatTime = (time: number) => {
    if (!time || time < 0) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg p-4 w-[480px] max-w-[calc(100vw-32px)]">
      <audio ref={audioRef} preload="metadata" />

      <div className="flex items-center gap-3">
        {playlist && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={!canGoPrev}
            className="w-8 h-8 p-0"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="default"
          size="sm"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        {playlist && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
            className="w-8 h-8 p-0"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={record.original_name || record.filename}>
            {record.original_name || record.filename}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground w-10">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              step={0.1}
              onChange={handleSeekChange}
              onMouseDown={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchStart={handleSeekStart}
              onTouchEnd={handleSeekEnd}
              className="flex-1 h-2 bg-muted rounded-full cursor-pointer 
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-4 
                [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:bg-primary 
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:appearance-none 
                [&::-moz-range-thumb]:w-4 
                [&::-moz-range-thumb]:h-4 
                [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-primary 
                [&::-moz-range-thumb]:border-0 
                [&::-moz-range-thumb]:cursor-pointer"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="w-8 h-8 p-0"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            value={isMuted ? 0 : volume}
            step={0.05}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-muted rounded-full cursor-pointer 
              [&::-webkit-slider-thumb]:appearance-none 
              [&::-webkit-slider-thumb]:w-3 
              [&::-webkit-slider-thumb]:h-3 
              [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-primary 
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:appearance-none 
              [&::-moz-range-thumb]:w-3 
              [&::-moz-range-thumb]:h-3 
              [&::-moz-range-thumb]:rounded-full 
              [&::-moz-range-thumb]:bg-primary 
              [&::-moz-range-thumb]:border-0 
              [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {playlist && currentIndex !== undefined && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          {currentIndex + 1} / {playlist.length}
        </div>
      )}
    </div>
  )
}