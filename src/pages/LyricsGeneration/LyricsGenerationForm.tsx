import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Settings2, Palette, Loader2, Wand2, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { cn } from '@/lib/utils'
import type { LyricsMode } from '@/types/lyrics'

export interface LyricsGenerationFormValues {
  readonly mode: LyricsMode
  readonly title: string
  readonly prompt: string
  readonly lyrics: string
  readonly parallelCount: number
}

interface LyricsGenerationFormProps extends LyricsGenerationFormValues {
  readonly isGenerating: boolean
  readonly updateForm: <K extends keyof LyricsGenerationFormValues>(key: K, value: LyricsGenerationFormValues[K]) => void
  readonly onGenerate: () => void
  readonly resourceReferenceSlot?: ReactNode
  readonly t: (key: string) => string
}

function isLyricsMode(value: string): value is LyricsMode {
  return value === 'write_full_song' || value === 'edit'
}

export function LyricsGenerationForm({
  mode,
  title,
  prompt,
  lyrics,
  parallelCount,
  isGenerating,
  updateForm,
  onGenerate,
  resourceReferenceSlot,
  t,
}: LyricsGenerationFormProps) {
  const handleModeChange = (value: string) => {
    if (isLyricsMode(value)) updateForm('mode', value)
  }

  return (
    <div className="xl:col-span-5 space-y-4">
      <ModeCard mode={mode} onModeChange={handleModeChange} />
      {resourceReferenceSlot}
      <ParametersCard
        mode={mode}
        title={title}
        prompt={prompt}
        lyrics={lyrics}
        parallelCount={parallelCount}
        isGenerating={isGenerating}
        updateForm={updateForm}
        t={t}
      />
      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full shadow-lg shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {t('common.generating')}
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            {t('lyrics.generate')}
          </>
        )}
      </Button>
    </div>
  )
}

function ModeCard({ mode, onModeChange }: { readonly mode: LyricsMode; readonly onModeChange: (value: string) => void }) {
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
          <Settings2 className="w-5 h-5" />
          <span className="text-base font-semibold">生成模式</span>
        </div>
        <div className="p-4">
          <Tabs value={mode} onValueChange={onModeChange}>
            <TabsList className="w-full">
              <TabsTrigger value="write_full_song" className="flex-1">
                <Wand2 className="w-4 h-4 mr-2" />
                创作模式
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex-1">
                <Edit3 className="w-4 h-4 mr-2" />
                编辑模式
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </motion.div>
  )
}

interface ParametersCardProps extends LyricsGenerationFormValues {
  readonly isGenerating: boolean
  readonly updateForm: <K extends keyof LyricsGenerationFormValues>(key: K, value: LyricsGenerationFormValues[K]) => void
  readonly t: (key: string) => string
}

function ParametersCard({
  mode,
  title,
  prompt,
  lyrics,
  parallelCount,
  isGenerating,
  updateForm,
  t,
}: ParametersCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Palette className="w-5 h-5" />
          <span className="text-base font-semibold">参数配置</span>
        </div>
        <div className="p-4 space-y-4">
          <TitleInput title={title} updateForm={updateForm} t={t} />
          {mode === 'write_full_song' && <PromptInput prompt={prompt} updateForm={updateForm} t={t} />}
          {mode === 'edit' && <LyricsInput lyrics={lyrics} updateForm={updateForm} t={t} />}
          <ParallelCountSelector
            parallelCount={parallelCount}
            isGenerating={isGenerating}
            updateForm={updateForm}
          />
        </div>
      </div>
    </motion.div>
  )
}

function TitleInput({ title, updateForm, t }: Pick<LyricsGenerationFormProps, 'title' | 'updateForm' | 't'>) {
  return (
    <div className="flex items-center gap-4">
      <Label className="flex-shrink-0">{t('lyrics.titleInput')}</Label>
      <Input
        value={title}
        onChange={(event) => updateForm('title', event.target.value)}
        placeholder="歌曲标题（可选）"
        maxLength={100}
        className="flex-1"
      />
    </div>
  )
}

function PromptInput({ prompt, updateForm, t }: Pick<LyricsGenerationFormProps, 'prompt' | 'updateForm' | 't'>) {
  return (
    <div className="space-y-2">
      <Label>{t('lyrics.prompt')}</Label>
      <Textarea
        value={prompt}
        onChange={(event) => updateForm('prompt', event.target.value)}
        placeholder={t('lyrics.promptPlaceholder')}
        maxLength={2000}
        rows={12}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground text-right">
        {prompt.length}/2000 {t('common.characters')}
      </p>
    </div>
  )
}

function LyricsInput({ lyrics, updateForm, t }: Pick<LyricsGenerationFormProps, 'lyrics' | 'updateForm' | 't'>) {
  return (
    <div className="space-y-2">
      <Label>{t('lyrics.lyricsInput')}</Label>
      <Textarea
        value={lyrics}
        onChange={(event) => updateForm('lyrics', event.target.value)}
        placeholder={t('lyrics.lyricsPlaceholder')}
        rows={12}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground text-right">
        {lyrics.length} {t('common.characters')}
      </p>
    </div>
  )
}

function ParallelCountSelector({
  parallelCount,
  isGenerating,
  updateForm,
}: Pick<LyricsGenerationFormProps, 'parallelCount' | 'isGenerating' | 'updateForm'>) {
  return (
    <div className="space-y-2">
      <Label>并发生成数量</Label>
      <div className="flex items-center gap-1">
        {Array.from({ length: 10 }, (_, index) => index + 1).map(count => (
          <button
            key={count}
            type="button"
            onClick={() => !isGenerating && updateForm('parallelCount', count)}
            disabled={isGenerating}
            className={cn(
              'w-8 h-8 rounded-md text-sm font-medium transition-all duration-200',
              parallelCount === count
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  )
}
