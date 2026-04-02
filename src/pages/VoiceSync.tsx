import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Volume2, Play, Download, Loader2, Sparkles, Wand2, Mic2, Music2, Gauge, SlidersHorizontal, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { createSyncVoice } from '@/lib/api/voice'
import { uploadMedia, type MediaSource } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { SPEECH_MODELS, VOICE_OPTIONS, EMOTIONS, type SpeechModel, type Emotion } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

const MAX_CHARS = 10000

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.01,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

const saveToMedia = async (
  blob: Blob,
  filename: string,
  source: MediaSource
): Promise<void> => {
  try {
    await uploadMedia(blob, filename, 'audio', source)
  } catch (error) {
    console.error('Failed to save media:', error)
  }
}

function VoiceWaveform({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-8">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-full"
          animate={
            isPlaying
              ? {
                  height: [8, 24 + Math.random() * 8, 8],
                  opacity: [0.6, 1, 0.6],
                }
              : { height: 4, opacity: 0.3 }
          }
          transition={{
            duration: 0.6 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.05,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function GlassAudioPlayer({ audioUrl, onDownload }: { audioUrl: string; onDownload: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="relative group">
      
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5 overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

        <div className="relative flex items-center gap-4">
          
          <button
            onClick={togglePlay}
            className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300"
          >
            {isPlaying ? (
              <div className="flex gap-0.5">
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" />
                <div className="w-1 h-4 bg-white rounded-full animate-pulse delay-75" />
              </div>
            ) : (
              <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
            )}
          </button>

          
          <div className="flex-1">
            <VoiceWaveform isPlaying={isPlaying} />

            
            <div className="mt-3 relative h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${progress}%` }}
                layoutId="progress"
              />
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>

            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          
          <button
            onClick={onDownload}
            className="shrink-0 w-10 h-10 rounded-lg bg-secondary/80 hover:bg-secondary/80 flex items-center justify-center text-muted-foreground/70 hover:text-emerald-400 transition-all duration-200"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        <audio ref={audioRef} src={audioUrl} className="hidden" />
      </div>
    </div>
  )
}

export default function VoiceSync() {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [model, setModel] = useState<SpeechModel>('speech-2.6-hd')
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id)
  const [emotion, setEmotion] = useState<Emotion>('auto')
  const [speed, setSpeed] = useState(1.0)
  const [volume, setVolume] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS
  const progressPercent = Math.min((charCount / MAX_CHARS) * 100, 100)

  const handleGenerate = async () => {
    if (!text.trim() || isOverLimit) return

    setIsGenerating(true)
    setError(null)
    setAudioUrl(null)

    try {
      const response = await createSyncVoice({
        model,
        text: text.trim(),
        voice_setting: {
          voice_id: voiceId,
          speed,
          vol: volume,
          pitch,
          emotion,
        },
        audio_setting: {
          sample_rate: 24000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      })

      const hexData = response.data
      const byteArray = new Uint8Array(hexData.length / 2)
      for (let i = 0; i < hexData.length; i += 2) {
        byteArray[i / 2] = parseInt(hexData.substring(i, i + 2), 16)
      }
      const blob = new Blob([byteArray], { type: 'audio/mp3' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      addUsage('voiceCharacters', charCount)
      addItem({
        type: 'voice',
        input: text.trim(),
        outputUrl: url,
        metadata: {
          model,
          voiceId,
          emotion,
          speed,
          volume,
          pitch,
        },
      })
      
      saveToMedia(blob, `voice_sync_${Date.now()}.wav`, 'voice_sync')
      } catch (err) {
        setError(err instanceof Error ? err.message : t('voiceSync.voiceGenerationFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `voice-${Date.now()}.mp3`
    a.click()
  }

  const selectedVoice = VOICE_OPTIONS.find((v) => v.id === voiceId)
  const selectedModel = SPEECH_MODELS.find((m) => m.id === model)
  const selectedEmotion = EMOTIONS.find((e) => e.id === emotion)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent">
            {t('voiceSync.title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('voiceSync.subtitleWithLimit', { count: MAX_CHARS.toLocaleString() })}
          </p>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
          <Mic2 className="w-10 h-10 relative text-emerald-400/80" />
        </div>
      </motion.div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          
          <motion.div
            variants={itemVariants}
            whileHover="hover"
            initial="rest"
            animate="rest"
          >
            <motion.div variants={cardHoverVariants} className="relative group">
              
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden">
                
                <div className="px-6 py-4 border-b border-border/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{t('voiceSync.textInputTitle')}</h2>
                    <p className="text-xs text-muted-foreground">{t('voiceSync.textInputDesc')}</p>
                  </div>
                </div>

                
                <div className="p-6">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('voiceSync.placeholder')}
                    className="min-h-[200px] resize-none bg-background/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl"
                  />

                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full transition-colors duration-300 ${
                            isOverLimit
                              ? 'bg-red-500'
                              : progressPercent > 80
                                ? 'bg-amber-500'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-medium ${
                          isOverLimit ? 'text-red-400' : 'text-zinc-400'
                        }`}
                      >
                        {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                      </span>
                      {isOverLimit && (
                        <Badge
                          variant="destructive"
                          className="bg-red-500/20 text-red-400 border-red-500/30"
                        >
                          {t('voiceSync.overLimit')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <span className="text-lg">!</span>
                </div>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          
          <AnimatePresence>
            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="relative">
                  
                  <div className="absolute -top-3 -right-3 z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
                      className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>

                  <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <Music2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{t('voiceSync.resultTitle')}</h2>
                        <p className="text-xs text-muted-foreground">{t('voiceSync.resultDesc')}</p>
                      </div>
                    </div>

                    <GlassAudioPlayer audioUrl={audioUrl} onDownload={handleDownload} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        
        <div className="space-y-6">
          
          <motion.div variants={itemVariants}>
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden">
              
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

              
              <div className="relative px-6 py-4 border-b border-border/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-card flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-muted-foreground/70" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('voiceSync.paramsTitle')}</h2>
                  <p className="text-xs text-muted-foreground">{t('voiceSync.paramsDesc')}</p>
                </div>
              </div>

              
              <div className="relative p-6 space-y-6">
                
                <div className="space-y-2.5">
                  <Label className="text-muted-foreground/70 text-sm">{t('voiceSync.modelLabel')}</Label>
                  <Select value={model} onValueChange={(v) => setModel(v as SpeechModel)}>
                    <SelectTrigger className="bg-background/50 border-border/60 text-foreground hover:border-emerald-500/40 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {SPEECH_MODELS.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          className="text-foreground focus:bg-secondary focus:text-foreground"
                        >
                          <div className="flex flex-col py-1">
                            <div className="flex items-center gap-2">
                              <span>{m.name}</span>
                              <Badge
                                variant={m.tier === 'latest' ? 'default' : 'secondary'}
                                className={`text-xs ${
                                  m.tier === 'latest'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : m.tier === 'recommended'
                                      ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                                      : 'bg-secondary/50 text-zinc-400'
                                }`}
                              >
                                {m.tier === 'latest'
                                  ? t('voiceSync.latest')
                                  : m.tier === 'recommended'
                                    ? t('voiceSync.recommended')
                                    : m.tier === 'fast'
                                      ? t('voiceSync.fast')
                                      : t('voiceSync.stable')}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {m.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                
                <div className="space-y-2.5">
                  <Label className="text-muted-foreground/70 text-sm">{t('voiceSync.voiceLabel')}</Label>
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger className="bg-background/50 border-border/60 text-foreground hover:border-emerald-500/40 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-64">
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem
                          key={voice.id}
                          value={voice.id}
                          className="text-foreground focus:bg-secondary focus:text-foreground"
                        >
                          <div className="flex items-center gap-3 py-1">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                voice.gender === 'male'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-pink-500/20 text-pink-400'
                              }`}
                            >
                              {voice.gender === 'male' ? '♂' : '♀'}
                            </div>
                            <span>{voice.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                
                <div className="space-y-2.5">
                  <Label className="text-muted-foreground/70 text-sm">{t('voiceSync.emotionLabel')}</Label>
                  <Select value={emotion} onValueChange={(v) => setEmotion(v as Emotion)}>
                    <SelectTrigger className="bg-background/50 border-border/60 text-foreground hover:border-emerald-500/40 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {EMOTIONS.map((e) => (
                        <SelectItem
                          key={e.id}
                          value={e.id}
                          className="text-foreground focus:bg-secondary focus:text-foreground"
                        >
                          <span className="mr-2">{e.emoji}</span>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                
                <div className="space-y-5 pt-2 border-t border-border/60">
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-muted-foreground/70 text-sm">{t('voiceSync.speedLabel')}</Label>
                      </div>
                      <span className="text-sm font-medium text-emerald-400">
                        {speed.toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      value={[speed]}
                      onValueChange={(v) => setSpeed(v[0])}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      className="cursor-pointer"
                    />
                  </div>

                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-muted-foreground/70 text-sm">{t('voiceSync.volumeLabel')}</Label>
                      </div>
                      <span className="text-sm font-medium text-emerald-400">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[volume]}
                      onValueChange={(v) => setVolume(v[0])}
                      min={0}
                      max={2.0}
                      step={0.1}
                      className="cursor-pointer"
                    />
                  </div>

                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Music2 className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-muted-foreground/70 text-sm">{t('voiceSync.pitchLabel')}</Label>
                      </div>
                      <span className="text-sm font-medium text-emerald-400">
                        {pitch > 0 ? `+${pitch}` : pitch}
                      </span>
                    </div>
                    <Slider
                      value={[pitch]}
                      onValueChange={(v) => setPitch(v[0])}
                      min={-10}
                      max={10}
                      step={1}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                
                <motion.button
                  onClick={handleGenerate}
                  disabled={!text.trim() || isOverLimit || isGenerating}
                  whileHover={{ scale: text.trim() && !isOverLimit && !isGenerating ? 1.02 : 1 }}
                  whileTap={{ scale: text.trim() && !isOverLimit && !isGenerating ? 0.98 : 1 }}
                  className={`w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                    text.trim() && !isOverLimit && !isGenerating
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 cursor-pointer'
                      : 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('voiceSync.generating')}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>{t('voiceSync.generateVoice')}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          
          <motion.div variants={itemVariants}>
            <div className="bg-card/40 backdrop-blur-sm border border-border/40 rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground/70 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('voiceSync.currentConfig')}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('voiceSync.modelLabel')}</span>
                  <span className="text-foreground font-medium">{selectedModel?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('voiceSync.voiceLabel')}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedVoice?.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
                      }`}
                    />
                    <span className="text-foreground">{selectedVoice?.name}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('voiceSync.emotionLabel')}</span>
                  <span className="text-foreground">
                    {selectedEmotion?.emoji} {selectedEmotion?.label}
                  </span>
                </div>
                <div className="h-px bg-secondary/60 my-3" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('voiceSync.speedLabel')}</span>
                  <span className="text-emerald-400/80 font-mono text-xs">
                    {speed.toFixed(1)}x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('voiceSync.volumeLabel')}</span>
                  <span className="text-emerald-400/80 font-mono text-xs">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('voiceSync.pitchLabel')}</span>
                  <span className="text-emerald-400/80 font-mono text-xs">{pitch}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </motion.div>
  )
}
