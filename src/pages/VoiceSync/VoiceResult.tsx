import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Download, Music2, Check, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { services } from '@/themes/tokens'
import { useAudioStore } from '@/stores/audio'

interface VoiceWaveformProps {
  isPlaying: boolean
}

function VoiceWaveform({ isPlaying }: VoiceWaveformProps) {
  return (
    <div className="flex items-center gap-0.5 h-8">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className={cn('w-1 rounded-full', services.voice.bg)}
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

interface GlassAudioPlayerProps {
  audioUrl: string
  onDownload: () => void
}

function GlassAudioPlayer({ audioUrl, onDownload }: GlassAudioPlayerProps) {
  const { playDirectUrl } = useAudioStore()
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const playGlobal = () => {
    playDirectUrl(audioUrl)
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <button
            onClick={togglePlay}
            className={cn(
              'shrink-0 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300',
              'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
            )}
          >
            {isPlaying ? (
              <div className="flex gap-0.5">
                <div className={cn('w-1 h-4 rounded-full animate-pulse', services.voice.bg)} />
                <div className={cn('w-1 h-4 rounded-full animate-pulse delay-75', services.voice.bg)} />
              </div>
            ) : (
              <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
            )}
          </button>

          <div className="flex-1">
            <VoiceWaveform isPlaying={isPlaying} />
          </div>

          <button
            onClick={playGlobal}
            title="全局播放（切换页面后继续播放）"
            className={cn(
              'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
              'bg-secondary/80 hover:bg-secondary text-muted-foreground/70 hover:text-foreground'
            )}
          >
            <ExternalLink className="w-5 h-5" />
          </button>

          <button
            onClick={onDownload}
            className={cn(
              'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
              'bg-secondary/80 hover:bg-secondary text-muted-foreground/70 hover:text-foreground'
            )}
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface VoiceResultProps {
  audioUrl: string
  onDownload: () => void
}

export function VoiceResult({ audioUrl, onDownload }: VoiceResultProps) {
  const { t } = useTranslation()

  return (
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
            className={cn('w-8 h-8 rounded-full flex items-center justify-center shadow-lg', 'bg-success text-success-foreground')}
          >
            <Check className="w-4 h-4" />
          </motion.div>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', services.voice.bg)}>
              <Music2 className={cn('w-5 h-5', services.voice.icon)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('voiceSync.resultTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('voiceSync.resultDesc')}</p>
            </div>
          </div>

          <GlassAudioPlayer audioUrl={audioUrl} onDownload={onDownload} />
        </div>
      </div>
    </motion.div>
  )
}
