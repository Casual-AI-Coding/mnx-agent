import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { services } from '@/themes/tokens'
import type { VoiceConfigSummary as VoiceConfigSummaryType } from './types'

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

interface VoiceConfigSummaryProps {
  config: VoiceConfigSummaryType
}

export function VoiceConfigSummary({ config }: VoiceConfigSummaryProps) {
  const { t } = useTranslation()

  return (
    <motion.div variants={itemVariants}>
      <div className="bg-card/40 backdrop-blur-sm border border-border/40 rounded-xl p-5">
        <h3 className="text-sm font-medium text-muted-foreground/70 mb-4 flex items-center gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full', services.voice.bg)} />
          {t('voiceSync.currentConfig')}
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('voiceSync.modelLabel')}</span>
            <span className="text-foreground font-medium">{config.modelName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('voiceSync.voiceLabel')}</span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  config.voiceGender === 'male' ? 'bg-primary' : 'bg-secondary'
                )}
              />
              <span className="text-foreground">{config.voiceName}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('voiceSync.emotionLabel')}</span>
            <span className="text-foreground">
              {config.emotionEmoji} {config.emotionLabel}
            </span>
          </div>
          <div className="h-px bg-secondary/60 my-3" />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('voiceSync.speedLabel')}</span>
            <span className={cn('font-mono text-xs', services.voice.text)}>
              {config.speed.toFixed(1)}x
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('voiceSync.volumeLabel')}</span>
            <span className={cn('font-mono text-xs', services.voice.text)}>
              {Math.round(config.volume * 100)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('voiceSync.pitchLabel')}</span>
            <span className={cn('font-mono text-xs', services.voice.text)}>{config.pitch}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
