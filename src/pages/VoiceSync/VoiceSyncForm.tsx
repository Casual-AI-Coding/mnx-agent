import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { services } from '@/themes/tokens'

const MAX_CHARS = 10000

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

interface VoiceSyncFormProps {
  text: string
  onTextChange: (text: string) => void
}

export function VoiceSyncForm({ text, onTextChange }: VoiceSyncFormProps) {
  const { t } = useTranslation()
  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS
  const progressPercent = Math.min((charCount / MAX_CHARS) * 100, 100)

  return (
    <motion.div
      variants={itemVariants}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <motion.div variants={cardHoverVariants} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', services.voice.bg)}>
              <Sparkles className={cn('w-5 h-5', services.voice.icon)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('voiceSync.textInputTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('voiceSync.textInputDesc')}</p>
            </div>
          </div>

          <div className="p-6">
            <Textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder={t('voiceSync.placeholder')}
              className="min-h-[200px] resize-none bg-background/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
            />

            <div className="mt-4 flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full transition-colors duration-300',
                      isOverLimit
                        ? 'bg-destructive'
                        : progressPercent > 80
                          ? 'bg-warning'
                          : services.voice.bg
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
                {isOverLimit && (
                  <Badge
                    variant="destructive"
                    className="bg-destructive/20 text-destructive border-destructive/30"
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
  )
}
