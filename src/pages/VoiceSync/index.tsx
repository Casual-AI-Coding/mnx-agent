import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AnimatePresence } from 'framer-motion'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { createSyncVoice } from '@/lib/api/voice'
import { uploadMedia, type MediaSource } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { SPEECH_MODELS, VOICE_OPTIONS, EMOTIONS, type SpeechModel, type Emotion } from '@/types'
import { VoiceSyncForm } from './VoiceSyncForm'
import { VoiceResult } from './VoiceResult'
import { VoiceSettings } from './VoiceSettings'
import { VoiceConfigSummary } from './VoiceConfigSummary'
import type { VoiceConfigSummary as VoiceConfigSummaryType } from './types'

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

export default function VoiceSync() {
  const { t } = useTranslation()
  const voiceSettings = useSettingsStore((s) => s.settings.generation.voice)
  const [text, setText] = useState('')
  const [model, setModel] = useState<SpeechModel>(voiceSettings.model as SpeechModel)
  const [voiceId, setVoiceId] = useState(voiceSettings.voiceId)
  const [emotion, setEmotion] = useState<Emotion>(voiceSettings.emotion as Emotion)
  const [speed, setSpeed] = useState(voiceSettings.speed)
  const [volume, setVolume] = useState(voiceSettings.volume)
  const [pitch, setPitch] = useState(voiceSettings.pitch)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS

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

  const configSummary: VoiceConfigSummaryType = {
    modelName: selectedModel?.name || '',
    voiceName: selectedVoice?.name || '',
    voiceGender: selectedVoice?.gender as 'male' | 'female' | undefined,
    emotionLabel: selectedEmotion?.label || '',
    emotionEmoji: selectedEmotion?.emoji || '',
    speed,
    volume,
    pitch,
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <PageHeader
        icon={<Mic className="w-5 h-5" />}
        title="语音同步合成"
        description="实时语音合成服务"
        gradient="sky-blue"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <VoiceSyncForm text={text} onTextChange={setText} />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive flex items-center gap-3"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', status.error.bgSubtle)}>
                  <span className={cn('text-lg', status.error.icon)}>!</span>
                </div>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {audioUrl && <VoiceResult audioUrl={audioUrl} onDownload={handleDownload} />}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <VoiceSettings
            model={model}
            voiceId={voiceId}
            emotion={emotion}
            speed={speed}
            volume={volume}
            pitch={pitch}
            text={text}
            isOverLimit={isOverLimit}
            isGenerating={isGenerating}
            onModelChange={setModel}
            onVoiceIdChange={setVoiceId}
            onEmotionChange={setEmotion}
            onSpeedChange={setSpeed}
            onVolumeChange={setVolume}
            onPitchChange={setPitch}
            onGenerate={handleGenerate}
          />

          <VoiceConfigSummary config={configSummary} />
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
