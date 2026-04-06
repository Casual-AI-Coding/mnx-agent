import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Upload,
  Clock,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Trash2,
  Volume2,
  Zap,
  Layers,
  Mic,
  MicOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { RetryableError } from '@/components/shared/RetryableError'
import { PageHeader } from '@/components/shared/PageHeader'
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
import { useSettingsStore } from '@/settings/store'
import { createAsyncVoice, getAsyncVoiceStatus } from '@/lib/api/voice'
import { uploadMedia, uploadMediaFromUrl, type MediaSource } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import {
  SPEECH_MODELS,
  VOICE_OPTIONS,
  EMOTIONS,
  type SpeechModel,
  type Emotion,
  type T2AAsyncStatusResponse,
} from '@/types'
import { cn } from '@/lib/utils'
import { status as statusTokens, services } from '@/themes/tokens'

const MAX_CHARS = 50000

type TaskStatus = 'idle' | 'creating' | 'pending' | 'processing' | 'completed' | 'failed'

interface Task {
  id: string
  taskId: string
  status: TaskStatus
  text: string
  createdAt: number
  result?: {
    audioUrl: string
    subtitleUrl?: string
    audioLength: number
  }
  error?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
}

const taskVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.3 },
  },
}

const saveToMedia = async (
  audioUrl: string,
  filename: string,
  source: MediaSource
): Promise<void> => {
  try {
    const response = await fetch(audioUrl)
    const blob = await response.blob()
    await uploadMedia(blob, filename, 'audio', source)
  } catch (error) {
    console.error('Failed to save media:', error)
  }
}

export default function VoiceAsync() {
  const [text, setText] = useState('')
  const [model, setModel] = useState<SpeechModel>('speech-2.6-hd')
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id)
  const [emotion, setEmotion] = useState<Emotion>('auto')
  const [speed, setSpeed] = useState(1.0)
  const [volume] = useState(1.0)
  const [pitch] = useState(0)
  const [activeTab, setActiveTab] = useState('text')
  const [fileId, setFileId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadRetryCount, setUploadRetryCount] = useState(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingIntervalsRef = useRef<NodeJS.Timeout[]>([])
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach(clearInterval)
      pollingIntervalsRef.current = []
    }
  }, [])

  const createTask = async () => {
    if (activeTab === 'text' && (!text.trim() || isOverLimit)) return
    if (activeTab === 'file' && !fileId) return

    try {
      const response = await createAsyncVoice({
        model,
        text: activeTab === 'text' ? text.trim() : undefined,
        file_id: activeTab === 'file' ? (fileId ?? undefined) : undefined,
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

      const newTask: Task = {
        id: response.trace_id,
        taskId: response.task_id,
        status: 'pending',
        text: activeTab === 'text' ? text.trim() : (fileId ? '文件任务' : ''),
        createdAt: Date.now(),
      }

      setTasks(prev => [newTask, ...prev])

      if (activeTab === 'text') {
        addUsage('voiceCharacters', text.length)
      }

      pollTaskStatus(newTask.taskId)
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const pollTaskStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const status = await getAsyncVoiceStatus(taskId)
        updateTaskStatus(taskId, status)

        if (status.status === 'completed') {
          return true
        } else if (status.status === 'failed') {
          return false
        }
        return false
      } catch {
        return false
      }
    }

    let attempts = 0
    const maxAttempts = 60

    const interval = setInterval(async () => {
      attempts++
      const complete = await poll()
      if (complete || attempts >= maxAttempts) {
        clearInterval(interval)
        pollingIntervalsRef.current = pollingIntervalsRef.current.filter(id => id !== interval)
      }
    }, 3000)
    pollingIntervalsRef.current.push(interval)
  }

  const updateTaskStatus = (taskId: string, status: T2AAsyncStatusResponse) => {
    setTasks(prev =>
      prev.map(task => {
        if (task.taskId !== taskId) return task

        const newTask: Task = {
          ...task,
          status: status.status as TaskStatus,
        }

        if (status.status === 'completed' && status.results) {
          newTask.result = {
            audioUrl: status.results.audio_url,
            subtitleUrl: status.results.subtitle_url,
            audioLength: status.results.audio_length,
          }
          addItem({
            type: 'voice',
            input: task.text,
            outputUrl: status.results.audio_url,
            metadata: {
              taskId,
              model,
              voiceId,
              audioLength: status.results.audio_length,
            },
          })
          
          saveToMedia(status.results.audio_url, `voice_async_${Date.now()}.wav`, 'voice_async')
        } else if (status.status === 'failed') {
          newTask.error = '生成失败'
        }

        return newTask
      })
    )
  }

  const uploadFile = async (file: File) => {
    setUploadError(null)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { settings } = useSettingsStore.getState()
      const { API_HOSTS } = await import('@/types')
      const baseUrl = API_HOSTS[settings.api.region]
      const apiKey = settings.api.minimaxKey

      const response = await fetch(`${baseUrl}/v1/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const data = await response.json()
      setFileId(data.file_id)
      setPendingFile(null)
      setUploadRetryCount(0)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '文件上传失败')
      setPendingFile(file)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.zip')) {
      toast.error('仅支持 .txt 和 .zip 文件')
      return
    }

    await uploadFile(file)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.zip')) {
      toast.error('仅支持 .txt 和 .zip 文件')
      return
    }

    await uploadFile(file)
  }

  const handleRetryUpload = () => {
    if (pendingFile) {
      setUploadRetryCount(prev => prev + 1)
      uploadFile(pendingFile)
    }
  }

  const clearUploadError = () => {
    setUploadError(null)
    setPendingFile(null)
    setUploadRetryCount(0)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId))
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return (
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.warning.bgSubtle)}>
            <Clock className={cn('w-4 h-4', statusTokens.warning.icon)} />
          </div>
        )
      case 'processing':
        return (
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.info.bgSubtle)}>
            <Loader2 className={cn('w-4 h-4 animate-spin', statusTokens.info.icon)} />
          </div>
        )
      case 'completed':
        return (
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.success.bgSubtle)}>
            <CheckCircle className={cn('w-4 h-4', statusTokens.success.icon)} />
          </div>
        )
      case 'failed':
        return (
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.error.bgSubtle)}>
            <XCircle className={cn('w-4 h-4', statusTokens.error.icon)} />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
          </div>
        )
    }
  }

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className={cn(statusTokens.warning.bgSubtle, statusTokens.warning.text, statusTokens.warning.border, 'hover:bg-warning/20')}>
            等待中
          </Badge>
        )
      case 'processing':
        return (
          <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border, 'hover:bg-info/20')}>
            处理中
          </Badge>
        )
      case 'completed':
        return (
          <Badge className={cn(statusTokens.success.bgSubtle, statusTokens.success.text, statusTokens.success.border, 'hover:bg-success/20')}>
            已完成
          </Badge>
        )
      case 'failed':
        return (
          <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border, 'hover:bg-error/20')}>
            失败
          </Badge>
        )
      default:
        return (
          <Badge className="bg-muted/10 text-foreground border-muted/20">
            未知
          </Badge>
        )
    }
  }

  const getProgressForStatus = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return 25
      case 'processing':
        return 60
      case 'completed':
        return 100
      case 'failed':
        return 100
      default:
        return 0
    }
  }

  const getProgressColor = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return statusTokens.warning.gradient
      case 'processing':
        return statusTokens.info.gradient
      case 'completed':
        return statusTokens.success.gradient
      case 'failed':
        return statusTokens.error.gradient
      default:
        return 'from-muted/40 to-muted-foreground/70/40'
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        icon={<MicOff className="w-5 h-5" />}
        title="语音异步合成"
        description="批量语音合成与长文本处理"
        gradient="sky-blue"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
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

                    <TabsContent value="text" className="mt-4 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-primary/5 rounded-xl blur-lg" />
                        <Textarea
                          value={text}
                          onChange={e => setText(e.target.value)}
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
                    </TabsContent>

                    <TabsContent value="file" className="mt-4 space-y-4">
                      <div
                        className={cn(
                          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
                          isDragging
                            ? cn('border-secondary', statusTokens.success.bgSubtle)
                            : 'border-border hover:border-border hover:bg-secondary/30'
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
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
                          onChange={handleFileUpload}
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
                              onRetry={handleRetryUpload}
                              retryCount={uploadRetryCount}
                              maxRetries={3}
                              className={cn(statusTokens.error.border, statusTokens.error.bgSubtle)}
                            />
                            <button
                              onClick={clearUploadError}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Layers className={cn('w-3.5 h-3.5', services.image.icon)} />
                        模型
                      </label>
                      <Select
                        value={model}
                        onValueChange={v => setModel(v as SpeechModel)}
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
                      <Select value={voiceId} onValueChange={setVoiceId}>
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
                        onValueChange={v => setEmotion(v as Emotion)}
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
                        onChange={e => setSpeed(parseFloat(e.target.value))}
                        className="bg-background/50 border-border/50 text-foreground focus:border-accent/50 focus:ring-accent/20 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className={cn('absolute inset-0 blur-xl rounded-xl', services.voice.bg)} />
                    <button
                      onClick={createTask}
                      disabled={
                        (activeTab === 'text' && (!text.trim() || isOverLimit)) ||
                        (activeTab === 'file' && !fileId)
                      }
                      className={`relative w-full py-4 rounded-xl font-semibold text-base transition-all duration-300 ${
                        (activeTab === 'text' && (!text.trim() || isOverLimit)) ||
                        (activeTab === 'file' && !fileId)
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

        <motion.div variants={cardVariants}>
          <div className="relative group h-full">
            <div className={cn('absolute inset-0 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity', statusTokens.warning.bgSubtle)} />
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', statusTokens.warning.bgSubtle)}>
                    <Clock className={cn('w-4 h-4', statusTokens.warning.icon)} />
                  </div>
                  <div className="font-semibold text-foreground">任务列表</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {tasks.length} 个任务
                </div>
              </div>

              <div className="p-6 max-h-[800px] overflow-y-auto task-scrollbar">
                {tasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                  >
                    <div className="relative">
                      <div className={cn('absolute inset-0 blur-3xl rounded-full', statusTokens.warning.bgSubtle)} />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-card border border-border flex items-center justify-center">
                        <Volume2 className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                    </div>
                    <p className="mt-6 text-lg font-medium text-muted-foreground/70">暂无任务</p>
                    <p className="text-sm text-muted-foreground/50 mt-2">
                      创建任务后将显示在这里
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-4">
                      {tasks.map((task, index) => (
                        <motion.div
                          key={task.taskId}
                          variants={taskVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          className="group relative"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {task.status === 'processing' && (
                            <div className={cn('absolute inset-0 blur-xl rounded-2xl animate-pulse', statusTokens.info.bgSubtle)} />
                          )}

                          <div
                            className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                              task.status === 'completed'
                                ? cn('bg-card/80', statusTokens.success.border)
                                : task.status === 'processing'
                                  ? cn('bg-card/80', statusTokens.info.border)
                                  : task.status === 'failed'
                                    ? cn('bg-card/80', statusTokens.error.border)
                                    : 'bg-card/60 border-border/50'
                            }`}
                          >
                            <div
                              className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${getProgressColor(task.status)} transition-all duration-500`}
                              style={{ width: `${getProgressForStatus(task.status)}%` }}
                            />

                            <div className="p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getStatusIcon(task.status)}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm text-foreground">
                                        {task.taskId.slice(0, 8)}...
                                      </span>
                                      {getStatusBadge(task.status)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {new Date(task.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeTask(task.taskId)}
                                  className={cn('p-2 rounded-lg text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error/10')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="relative">
                                <div
                                  className={`absolute inset-0 rounded-lg opacity-10 ${
                                    task.status === 'completed'
                                      ? statusTokens.success.bg
                                      : task.status === 'processing'
                                        ? statusTokens.info.bg
                                        : task.status === 'failed'
                                          ? statusTokens.error.bg
                                          : 'bg-muted'
                                  }`}
                                />
                                <p className="relative p-3 text-sm text-muted-foreground/70 line-clamp-2">
                                  {task.text.slice(0, 150)}
                                  {task.text.length > 150 ? '...' : ''}
                                </p>
                              </div>

                              {task.status === 'completed' && task.result && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex gap-3"
                                >
                                  <button
                                    onClick={() =>
                                      handleDownload(
                                        task.result!.audioUrl,
                                        `audio-${task.taskId}.mp3`
                                      )
                                    }
                                    className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-200 group/btn border border-secondary/20', services.voice.bg, 'hover:opacity-80', services.voice.text)}
                                  >
                                    <Download
                                      className="w-4 h-4 group-hover/btn:animate-bounce"
                                    />
                                    <span className="font-medium">
                                      下载音频
                                      {task.result.audioLength > 0 && (
                                        <span className={cn('ml-1 opacity-70', services.voice.text)}>
                                          ({formatDuration(task.result.audioLength)})
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                  {task.result.subtitleUrl && (
                                    <button
                                      onClick={() =>
                                        handleDownload(
                                          task.result!.subtitleUrl!,
                                          `subtitle-${task.taskId}.srt`
                                        )
                                      }
                                      className="flex items-center justify-center gap-2 py-2.5 px-4 bg-secondary/50 hover:bg-secondary/50 border border-border text-foreground rounded-lg transition-all duration-200"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>字幕</span>
                                    </button>
                                  )}
                                </motion.div>
                              )}

                              {task.error && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={cn('flex items-center gap-2 p-3 rounded-lg', statusTokens.error.bgSubtle, statusTokens.error.border)}
                                >
                                  <XCircle className={cn('w-4 h-4 shrink-0', statusTokens.error.icon)} />
                                  <p className={cn('text-sm', statusTokens.error.text)}>{task.error}</p>
                                </motion.div>
                              )}

                              {task.status === 'processing' && (
                                <div className={cn('flex items-center gap-2 text-xs', statusTokens.info.text)}>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>正在生成音频，请稍候...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .task-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .task-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .task-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(45, 212, 191, 0.3), rgba(34, 211, 238, 0.2));
          border-radius: 3px;
        }
        .task-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(45, 212, 191, 0.5), rgba(34, 211, 238, 0.4));
        }
      `}</style>
    </motion.div>
  )
}
