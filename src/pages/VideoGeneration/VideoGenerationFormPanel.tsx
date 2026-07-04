import { useTranslation } from 'react-i18next'
import { Camera, Lightbulb, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ResourceReferenceCard } from '@/components/resources/ResourceReferenceCard'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { CAMERA_COMMANDS, VIDEO_MODELS, type CameraCommand, type VideoModel } from '@/types'
import type { ResourceReference } from '@/lib/resource-references'
import type { VideoGenerationFormData } from '../VideoGeneration.js'

interface VideoGenerationFormPanelProps {
  formData: VideoGenerationFormData
  isGenerating: boolean
  error: string | null
  onFormChange: (updates: Partial<VideoGenerationFormData>) => void
  onGenerate: () => void
  onTrackResourceReference: (reference: ResourceReference) => void
}

export function VideoGenerationFormPanel({
  formData,
  isGenerating,
  error,
  onFormChange,
  onGenerate,
  onTrackResourceReference,
}: VideoGenerationFormPanelProps) {
  const { prompt, model, cameraCommand } = formData

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PromptSettingsPanel
        prompt={prompt}
        model={model}
        cameraCommand={cameraCommand}
        isGenerating={isGenerating}
        error={error}
        onFormChange={onFormChange}
        onGenerate={onGenerate}
        onTrackResourceReference={onTrackResourceReference}
      />
      <UsageTipsPanel />
    </div>
  )
}

interface PromptSettingsPanelProps {
  prompt: string
  model: VideoModel
  cameraCommand: CameraCommand
  isGenerating: boolean
  error: string | null
  onFormChange: (updates: Partial<VideoGenerationFormData>) => void
  onGenerate: () => void
  onTrackResourceReference: (reference: ResourceReference) => void
}

function PromptSettingsPanel({
  prompt,
  model,
  cameraCommand,
  isGenerating,
  error,
  onFormChange,
  onGenerate,
  onTrackResourceReference,
}: PromptSettingsPanelProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Sparkles className="w-5 h-5 text-accent-foreground" />
          <span className="text-sm font-medium text-foreground">{t('videoGeneration.promptTitle')}</span>
        </div>
        <div className="p-4 space-y-4">
          <Textarea
            value={prompt}
            onChange={(event) => onFormChange({ prompt: event.target.value })}
            placeholder={t('videoGeneration.placeholder')}
            className="min-h-[200px] resize-none bg-background/50 border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
          />
          <ResourceReferenceCard
            generationType="video"
            onApplyTemplate={({ content, reference }) => {
              onFormChange({ prompt: content })
              onTrackResourceReference(reference)
            }}
            onApplyWorkflow={({ reference }) => onTrackResourceReference(reference)}
          />
          <ModelSelect model={model} onChange={(nextModel) => onFormChange({ model: nextModel })} />
          <CameraSelect command={cameraCommand} onChange={(nextCommand) => onFormChange({ cameraCommand: nextCommand })} />
          {error && <div className="p-4 border border-destructive rounded-lg text-destructive bg-destructive/10">{error}</div>}
          <Button onClick={onGenerate} disabled={!prompt.trim() || isGenerating} className="w-full" size="lg">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('videoGeneration.createTask')}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                {t('videoGeneration.generateVideo')}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function ModelSelect({ model, onChange }: { model: VideoModel; onChange: (model: VideoModel) => void }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{t('videoGeneration.modelLabel')}</label>
      <Select value={model} onValueChange={(value) => onChange(findVideoModel(value, model))}>
        <SelectTrigger className="bg-background/50 border-border text-foreground hover:border-primary/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {VIDEO_MODELS.map((item) => (
            <SelectItem key={item.id} value={item.id} className="text-foreground focus:bg-secondary">
              <div className="flex flex-col">
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CameraSelect({ command, onChange }: { command: CameraCommand; onChange: (command: CameraCommand) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2 text-foreground">
        <Camera className="w-4 h-4" />
        镜头控制
      </label>
      <Select value={command} onValueChange={(value) => onChange(findCameraCommand(value, command))}>
        <SelectTrigger className="bg-background/50 border-border text-foreground hover:border-primary/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {CAMERA_COMMANDS.map((item) => (
            <SelectItem key={item.id} value={item.id} className="text-foreground focus:bg-secondary">
              <div className="flex flex-col">
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function UsageTipsPanel() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/10 via-primary/10 to-secondary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Lightbulb className="w-5 h-5 text-secondary-foreground" />
          <span className="text-sm font-medium text-foreground">{t('videoGeneration.usageTipsTitle')}</span>
        </div>
        <div className="p-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• {t('videoGeneration.tip1')}</li>
            <li>• {t('videoGeneration.tip2')}</li>
            <li>• {t('videoGeneration.tip3')}</li>
            <li>• {t('videoGeneration.tip4')}</li>
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

function findVideoModel(value: string, fallback: VideoModel): VideoModel {
  return VIDEO_MODELS.find((item) => item.id === value)?.id ?? fallback
}

function findCameraCommand(value: string, fallback: CameraCommand): CameraCommand {
  return CAMERA_COMMANDS.find((item) => item.id === value)?.id ?? fallback
}
