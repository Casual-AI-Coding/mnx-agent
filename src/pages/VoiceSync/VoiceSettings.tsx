import { useTranslation } from 'react-i18next'
import { Volume2, Gauge, Music2, SlidersHorizontal, Loader2, Wand2 } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'
import { SPEECH_MODELS, VOICE_OPTIONS, EMOTIONS, type SpeechModel, type Emotion } from '@/types'

const genderTokens = {
  male: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  female: { bg: 'bg-secondary/10', text: 'text-secondary-foreground', border: 'border-secondary/20' },
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

interface VoiceSettingsProps {
  model: SpeechModel
  voiceId: string
  emotion: Emotion
  speed: number
  volume: number
  pitch: number
  text: string
  isOverLimit: boolean
  isGenerating: boolean
  onModelChange: (model: SpeechModel) => void
  onVoiceIdChange: (voiceId: string) => void
  onEmotionChange: (emotion: Emotion) => void
  onSpeedChange: (speed: number) => void
  onVolumeChange: (volume: number) => void
  onPitchChange: (pitch: number) => void
  onGenerate: () => void
}

export function VoiceSettings({
  model,
  voiceId,
  emotion,
  speed,
  volume,
  pitch,
  text,
  isOverLimit,
  isGenerating,
  onModelChange,
  onVoiceIdChange,
  onEmotionChange,
  onSpeedChange,
  onVolumeChange,
  onPitchChange,
  onGenerate,
}: VoiceSettingsProps) {
  const { t } = useTranslation()
  const selectedVoice = VOICE_OPTIONS.find((v) => v.id === voiceId)
  const selectedModel = SPEECH_MODELS.find((m) => m.id === model)
  const selectedEmotion = EMOTIONS.find((e) => e.id === emotion)

  return (
    <motion.div variants={itemVariants}>
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

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
            <Select value={model} onValueChange={(v) => onModelChange(v as SpeechModel)}>
              <SelectTrigger className={cn('bg-background/50 border-border/60 text-foreground hover:border-secondary/40 transition-colors')}>
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
                          className={cn(
                            'text-xs',
                            m.tier === 'latest'
                              ? cn(status.success.bgSubtle, status.success.text, status.success.border)
                              : m.tier === 'recommended'
                                ? cn(status.info.bgSubtle, status.info.text, status.info.border)
                                : 'bg-muted/50 text-muted-foreground'
                          )}
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
                      <span className="text-xs text-muted-foreground mt-0.5">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label className="text-muted-foreground/70 text-sm">{t('voiceSync.voiceLabel')}</Label>
            <Select value={voiceId} onValueChange={onVoiceIdChange}>
              <SelectTrigger className={cn('bg-background/50 border-border/60 text-foreground hover:border-secondary/40 transition-colors')}>
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
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                          voice.gender === 'male' ? genderTokens.male.bg : genderTokens.female.bg,
                          voice.gender === 'male' ? genderTokens.male.text : genderTokens.female.text
                        )}
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
            <Select value={emotion} onValueChange={(v) => onEmotionChange(v as Emotion)}>
              <SelectTrigger className={cn('bg-background/50 border-border/60 text-foreground hover:border-secondary/40 transition-colors')}>
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
                <span className={cn('text-sm font-medium', services.voice.text)}>
                  {speed.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[speed]}
                onValueChange={(v) => onSpeedChange(v[0])}
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
                <span className={cn('text-sm font-medium', services.voice.text)}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(v) => onVolumeChange(v[0])}
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
                <span className={cn('text-sm font-medium', services.voice.text)}>
                  {pitch > 0 ? `+${pitch}` : pitch}
                </span>
              </div>
              <Slider
                value={[pitch]}
                onValueChange={(v) => onPitchChange(v[0])}
                min={-10}
                max={10}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </div>

          <motion.button
            onClick={onGenerate}
            disabled={!text.trim() || isOverLimit || isGenerating}
            whileHover={{ scale: text.trim() && !isOverLimit && !isGenerating ? 1.02 : 1 }}
            whileTap={{ scale: text.trim() && !isOverLimit && !isGenerating ? 0.98 : 1 }}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300',
              text.trim() && !isOverLimit && !isGenerating
                ? cn('bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 cursor-pointer')
                : 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed'
            )}
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
  )
}
