import { motion } from 'framer-motion'
import { FileText, Upload, Sparkles, Layers, Mic, Clock, Zap, XCircle, CheckCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { RetryableError } from '@/components/shared/RetryableError'
import {
  SPEECH_MODELS,
  VOICE_OPTIONS,
  EMOTIONS,
} from '@/types'
import { cn } from '@/lib/utils'
import { status as statusTokens, services } from '@/themes/tokens'
import type {
  VoiceAsyncFormProps,
  VoiceTextInputProps,
  VoiceUploadSectionProps,
  VoiceParameterSettingsProps,
  SpeechModel,
  Emotion,
} from './types'
import { MAX_CHARS } from './types'

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
}

function VoiceTextInput({ text, onChange, charCount, isOverLimit }: VoiceTextInputProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-primary/5 rounded-xl blur-lg" />
        <Textarea
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder={`输入要转换为语音的文本（最大 ${MAX_CHARS.toLocaleString()} 字符）...`}
          className="relative min-h-[200px] resize-none bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-secondary/50 focus:ring-secondary/20 rounded-xl"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div
            className={cn('w-2 h-2 rounded-full animate-pulse', isOverLimit ? statusTokens.error.bg : statusTokens.success.bg)}
          />
          <span className={isOverLimit ? statusTokens.error.text : 'text-muted-foreground/70'}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} 字符
          </span>
        </div>
        {isOverLimit && (
          <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border)}>
            超出限制
          </Badge>
        )}
      </div>
    </div>
  )
}

function VoiceUploadSection({
  uploadError,
  uploadRetryCount,
  pendingFile,
  fileId,
  isDragging,
  onFileUpload,
  onDrop,
  onDragOver,
  onDragLeave,
  onRetryUpload,
  onClearUploadError,
  fileInputRef,
}: VoiceUploadSectionProps) {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
          isDragging
            ? cn('border-secondary', statusTokens.success.bgSubtle)
            : 'border-border hover:border-border hover:bg-secondary/30'
        )}
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-primary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className={cn('w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center', services.voice.bg)}>
            <Upload className={cn('w-8 h-8', services.voice.icon)} />
          </div>
          <p className="text-foreground font-medium mb-2">
            拖放文件或点击上传
          </p>
          <p className="text-xs text-muted-foreground">支持 .txt 和 .zip 格式</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.zip"
          onChange={onFileUpload}
          className="hidden"
        />
      </div>
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative overflow-hidden"
          >
            <RetryableError
              error={uploadError}
              onRetry={onRetryUpload}
              retryCount={uploadRetryCount}
              maxRetries={3}
              className={cn(statusTokens.error.border, statusTokens.error.bgSubtle)}
            />
            <button
              onClick={onClearUploadError}
              className={cn('absolute top-2 right-2 p-1 transition-colors', statusTokens.error.icon, 'opacity-70 hover:opacity-100')}
              aria-label="Dismiss error"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fileId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative overflow-hidden"
          >
            <div className={cn('absolute inset-0 opacity-20', services.voice.bg)} />
            <div className={cn('relative flex items-center gap-3 p-4 border rounded-xl', statusTokens.success.bgSubtle, statusTokens.success.border)}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', services.voice.bg)}>
                <CheckCircle className={cn('w-4 h-4', services.voice.icon)} />
              </div>
              <div className="flex-1">
                <p className={cn('text-sm font-medium', statusTokens.success.text)}>
                  文件上传成功
                </p>
                <p className="text-xs text-muted-foreground/70 font-mono">
                  {fileId}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function VoiceParameterSettings({
  model,
  voiceId,
  emotion,
  speed,
  onModelChange,
  onVoiceIdChange,
  onEmotionChange,
  onSpeedChange,
}: VoiceParameterSettingsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Layers className={cn('w-3.5 h-3.5', services.image.icon)} />
          模型
        </label>
        <Select
          value={model}
          onValueChange={v => onModelChange(v as SpeechModel)}
        >
          <SelectTrigger className="bg-background/50 border-border/50 text-foreground hover:border-accent/50 transition-colors rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {SPEECH_MODELS.map(m => (
              <SelectItem
                key={m.id}
                value={m.id}
                className="text-foreground focus:bg-secondary focus:text-foreground"
              >
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Mic className={cn('w-3.5 h-3.5', services.image.icon)} />
          音色
        </label>
        <Select value={voiceId} onValueChange={onVoiceIdChange}>
          <SelectTrigger className="bg-background/50 border-border/50 text-foreground hover:border-accent/50 transition-colors rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {VOICE_OPTIONS.map(voice => (
              <SelectItem
                key={voice.id}
                value={voice.id}
                className="text-foreground focus:bg-secondary focus:text-foreground"
              >
                {voice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Sparkles className={cn('w-3.5 h-3.5', services.image.icon)} />
          情绪
        </label>
        <Select
          value={emotion}
          onValueChange={v => onEmotionChange(v as Emotion)}
        >
          <SelectTrigger className="bg-background/50 border-border/50 text-foreground hover:border-accent/50 transition-colors rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {EMOTIONS.map(e => (
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className={cn('w-3.5 h-3.5', services.image.icon)} />
          语速 ({speed.toFixed(1)}x)
        </label>
        <Input
          type="number"
          min={0.5}
          max={2}
          step={0.1}
          value={speed}
          onChange={e => onSpeedChange(parseFloat(e.target.value))}
          className="bg-background/50 border-border/50 text-foreground focus:border-accent/50 focus:ring-accent/20 rounded-xl"
        />
      </div>
    </div>
  )
}

export function VoiceAsyncForm({
  formData,
  onFormChange,
  onCreateTask,
  uploadError,
  uploadRetryCount,
  pendingFile,
  isDragging,
  onFileUpload,
  onDrop,
  onDragOver,
  onDragLeave,
  onRetryUpload,
  onClearUploadError,
  fileInputRef,
  charCount,
  isOverLimit,
}: VoiceAsyncFormProps) {
  const { text, model, voiceId, emotion, speed, activeTab, fileId } = formData

  const canCreateTask =
    (activeTab === 'text' && text.trim() && !isOverLimit) ||
    (activeTab === 'file' && fileId)

  return (
    <div className="space-y-6">
      <motion.div variants={cardVariants}>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-primary/10 to-accent/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', services.voice.bg)}>
                <Sparkles className={cn('w-4 h-4', services.voice.icon)} />
              </div>
              <div className="font-semibold text-foreground">输入内容</div>
            </div>

            <div className="p-6">
              <Tabs value={activeTab} onValueChange={(v) => onFormChange({ activeTab: v as 'text' | 'file' })}>
                <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-border/50 p-1 rounded-xl">
                  <TabsTrigger
                    value="text"
                    className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary-foreground data-[state=active]:border-secondary/30 rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      文本输入
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="file"
                    className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary-foreground data-[state=active]:border-secondary/30 rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      文件上传
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-4">
                  <VoiceTextInput
                    text={text}
                    onChange={(t) => onFormChange({ text: t })}
                    charCount={charCount}
                    isOverLimit={isOverLimit}
                  />
                </TabsContent>

                <TabsContent value="file" className="mt-4">
                  <VoiceUploadSection
                    uploadError={uploadError}
                    uploadRetryCount={uploadRetryCount}
                    pendingFile={pendingFile}
                    fileId={fileId}
                    isDragging={isDragging}
                    onFileUpload={onFileUpload}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onRetryUpload={onRetryUpload}
                    onClearUploadError={onClearUploadError}
                    fileInputRef={fileInputRef}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={cardVariants}>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-primary/10 to-secondary/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', services.image.bg)}>
                <Zap className={cn('w-4 h-4', services.image.icon)} />
              </div>
              <div className="font-semibold text-foreground">参数设置</div>
            </div>

            <div className="p-6 space-y-6">
              <VoiceParameterSettings
                model={model}
                voiceId={voiceId}
                emotion={emotion}
                speed={speed}
                onModelChange={(m) => onFormChange({ model: m })}
                onVoiceIdChange={(v) => onFormChange({ voiceId: v })}
                onEmotionChange={(e) => onFormChange({ emotion: e })}
                onSpeedChange={(s) => onFormChange({ speed: s })}
              />

              <div className="relative">
                <div className={cn('absolute inset-0 blur-xl rounded-xl', services.voice.bg)} />
                <button
                  onClick={onCreateTask}
                  disabled={!canCreateTask}
                  className={`relative w-full py-4 rounded-xl font-semibold text-base transition-all duration-300 ${
                    !canCreateTask
                      ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
                      : cn(services.voice.bgSolid, 'hover:opacity-90 shadow-lg shadow-secondary/25 hover:shadow-secondary/40 hover:scale-[1.02] active:scale-[0.98]')
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    创建任务
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
