import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import type { MediaRecord } from '@/types/media'

interface AudioPlayerProps {
  record?: MediaRecord
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
  const [showVolume, setShowVolume] = useState(false)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [isTitleOverflow, setIsTitleOverflow] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const isSeekingRef = useRef(false)
  const seekTargetRef = useRef<number | null>(null)

  const hasPlaylist = playlist && playlist.length > 0 && currentIndex !== undefined
  const canGoPrev = hasPlaylist && currentIndex > 0
  const canGoNext = hasPlaylist && currentIndex < playlist.length - 1

  const displayTitle = record?.original_name || record?.filename || '音频播放'

  useEffect(() => {
    if (titleRef.current) {
      const { scrollWidth, clientWidth } = titleRef.current
      setIsTitleOverflow(scrollWidth > clientWidth)
    }
  }, [displayTitle])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime)
      }
    }
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    
    const handleProgress = () => {
      if (audio.buffered.length > 0 && audio.duration > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
        setBufferedPercent((bufferedEnd / audio.duration) * 100)
      }
    }
    
    const handleSeeked = () => {
      isSeekingRef.current = false
      if (seekTargetRef.current !== null) {
        setCurrentTime(seekTargetRef.current)
        seekTargetRef.current = null
      }
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      if (onNext && canGoNext) onNext()
    }
    
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('progress', handleProgress)
    audio.addEventListener('seeked', handleSeeked)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('progress', handleProgress)
      audio.removeEventListener('seeked', handleSeeked)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [canGoNext, onNext])

  useEffect(() => {
    if (signedUrl && audioRef.current) {
      const audio = audioRef.current
      audio.src = signedUrl
      audio.load()
      setCurrentTime(0)
      setBufferedPercent(0)
      isSeekingRef.current = false
      seekTargetRef.current = null
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }, [signedUrl])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
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

  const calculateSeekTime = useCallback((clientX: number): number => {
    if (!progressRef.current || duration === 0) return 0
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return percent * duration
  }, [duration])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const seekTime = calculateSeekTime(e.clientX)
      setCurrentTime(seekTime)
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      const audio = audioRef.current
      if (audio) {
        const seekTime = calculateSeekTime(e.clientX)
        seekTargetRef.current = seekTime
        isSeekingRef.current = true
        audio.currentTime = seekTime
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    const handleMouseDown = (e: MouseEvent) => {
      const seekTime = calculateSeekTime(e.clientX)
      setCurrentTime(seekTime)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const progress = progressRef.current
    if (progress) {
      progress.addEventListener('mousedown', handleMouseDown)
    }

    return () => {
      if (progress) {
        progress.removeEventListener('mousedown', handleMouseDown)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [calculateSeekTime])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }, [isPlaying])

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setVolume(percent)
    setIsMuted(false)
  }, [])

  const formatTime = (t: number) => {
    if (!t || t < 0) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border shadow-xl rounded-xl p-3 w-[400px]">
      <audio ref={audioRef} preload="auto" />

      <div className="flex items-center gap-1.5 mb-2">
        <button onClick={onPrev} disabled={!canGoPrev} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent/50 disabled:opacity-30">
          <SkipBack className="w-4 h-4" />
        </button>
        <button onClick={togglePlay} className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button onClick={onNext} disabled={!canGoNext} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent/50 disabled:opacity-30">
          <SkipForward className="w-4 h-4" />
        </button>

        <div ref={titleRef} className="flex-1 ml-1 overflow-hidden" title={displayTitle}>
          <span 
            className={`text-xs font-medium whitespace-nowrap inline-block ${isTitleOverflow ? 'animate-marquee' : ''}`}
            style={isTitleOverflow ? { animationDuration: '8s' } : undefined}
          >
            {displayTitle}{isTitleOverflow ? `  ${displayTitle}` : ''}
          </span>
        </div>

        <div className="relative" ref={volumeRef}>
          <button onClick={() => setShowVolume(!showVolume)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent/50">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {showVolume && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover border border-border rounded-lg shadow-lg" onClick={handleVolumeChange}>
              <div className="w-20 h-1.5 bg-muted rounded-full cursor-pointer">
                <div className="h-full bg-primary rounded-full" style={{ width: `${volume * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <button onClick={onClose} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent/50">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-7 text-right">{formatTime(currentTime)}</span>
        <div
          ref={progressRef}
          className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer relative"
        >
          <div className="absolute h-full bg-primary/30 rounded-full" style={{ width: `${bufferedPercent}%` }} />
          <div className="absolute h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground w-7">{formatTime(duration)}</span>
        {playlist && currentIndex !== undefined && (
          <span className="text-[10px] text-muted-foreground ml-1">{currentIndex + 1}/{playlist.length}</span>
        )}
      </div>
    </div>
  )
}