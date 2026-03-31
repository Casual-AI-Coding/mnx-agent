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
} from 'lucide-react'
import { RetryableError } from '@/components/shared/RetryableError'
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
      const { region } = await import('@/stores/app').then(m => m.useAppStore.getState())
      const { API_HOSTS } = await import('@/types')
      const baseUrl = API_HOSTS[region]
      const { apiKey } = await import('@/stores/app').then(m => m.useAppStore.getState())

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
      alert('仅支持 .txt 和 .zip 文件')
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
      alert('仅支持 .txt 和 .zip 文件')
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
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
        )
      case 'processing':
        return (
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          </div>
        )
      case 'completed':
        return (
          <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-teal-400" />
          </div>
        )
      case 'failed':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-zinc-500/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-zinc-400" />
          </div>
        )
    }
  }

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20">
            等待中
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20">
            处理中
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500/20">
            已完成
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20">
            失败
          </Badge>
        )
      default:
        return (
          <Badge className="bg-zinc-500/10 text-zinc-300 border-zinc-500/20">
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
        return 'from-amber-500/40 to-amber-400/40'
      case 'processing':
        return 'from-cyan-500/40 to-teal-400/40'
      case 'completed':
        return 'from-teal-500/40 to-emerald-400/40'
      case 'failed':
        return 'from-rose-500/40 to-red-400/40'
      default:
        return 'from-zinc-500/40 to-zinc-400/40'
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-blue-500/20 blur-2xl rounded-3xl opacity-60" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                  异步语音生成
                </h1>
              </div>
            </div>
            <p className="text-zinc-400 text-sm pl-1">
              支持长文本（最大 {MAX_CHARS.toLocaleString()} 字符）或文件输入，任务完成后可下载音频文件
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <motion.div variants={cardVariants}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="font-semibold text-zinc-100">输入内容</div>
                </div>

                <div className="p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-950/50 border border-zinc-800/50 p-1 rounded-xl">
                      <TabsTrigger
                        value="text"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500/20 data-[state=active]:to-cyan-500/20 data-[state=active]:text-teal-300 data-[state=active]:border-teal-500/30 rounded-lg transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          文本输入
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        value="file"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500/20 data-[state=active]:to-cyan-500/20 data-[state=active]:text-teal-300 data-[state=active]:border-teal-500/30 rounded-lg transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          文件上传
                        </div>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="mt-4 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 rounded-xl blur-lg" />
                        <Textarea
                          value={text}
                          onChange={e => setText(e.target.value)}
                          placeholder={`输入要转换为语音的文本（最大 ${MAX_CHARS.toLocaleString()} 字符）...`}
                          className="relative min-h-[200px] resize-none bg-zinc-950/50 border-zinc-800/50 text-zinc-100 placeholder:text-zinc-600 focus:border-teal-500/50 focus:ring-teal-500/20 rounded-xl"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${isOverLimit ? 'bg-rose-500' : 'bg-teal-500'} animate-pulse`}
                          />
                          <span className={isOverLimit ? 'text-rose-400' : 'text-zinc-400'}>
                            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} 字符
                          </span>
                        </div>
                        {isOverLimit && (
                          <Badge className="bg-rose-500/10 text-rose-300 border-rose-500/20">
                            超出限制
                          </Badge>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="file" className="mt-4 space-y-4">
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                          isDragging
                            ? 'border-teal-500 bg-teal-500/10'
                            : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-cyan-500/5 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-teal-400" />
                          </div>
                          <p className="text-zinc-300 font-medium mb-2">
                            拖放文件或点击上传
                          </p>
                          <p className="text-xs text-zinc-500">支持 .txt 和 .zip 格式</p>
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
                              className="border-rose-500/30 bg-rose-500/5"
                            />
                            <button
                              onClick={clearUploadError}
                              className="absolute top-2 right-2 p-1 text-rose-400/70 hover:text-rose-400 transition-colors"
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
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 opacity-20" />
                            <div className="relative flex items-center gap-3 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-teal-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-teal-300">
                                  文件上传成功
                                </p>
                                <p className="text-xs text-teal-400/70 font-mono">
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
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="font-semibold text-zinc-100">参数设置</div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-violet-400" />
                        模型
                      </label>
                      <Select
                        value={model}
                        onValueChange={v => setModel(v as SpeechModel)}
                      >
                        <SelectTrigger className="bg-zinc-950/50 border-zinc-800/50 text-zinc-300 hover:border-violet-500/50 transition-colors rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {SPEECH_MODELS.map(m => (
                            <SelectItem
                              key={m.id}
                              value={m.id}
                              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                            >
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5 text-violet-400" />
                        音色
                      </label>
                      <Select value={voiceId} onValueChange={setVoiceId}>
                        <SelectTrigger className="bg-zinc-950/50 border-zinc-800/50 text-zinc-300 hover:border-violet-500/50 transition-colors rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {VOICE_OPTIONS.map(voice => (
                            <SelectItem
                              key={voice.id}
                              value={voice.id}
                              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                            >
                              {voice.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        情绪
                      </label>
                      <Select
                        value={emotion}
                        onValueChange={v => setEmotion(v as Emotion)}
                      >
                        <SelectTrigger className="bg-zinc-950/50 border-zinc-800/50 text-zinc-300 hover:border-violet-500/50 transition-colors rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {EMOTIONS.map(e => (
                            <SelectItem
                              key={e.id}
                              value={e.id}
                              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                            >
                              <span className="mr-2">{e.emoji}</span>
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        语速 ({speed.toFixed(1)}x)
                      </label>
                      <Input
                        type="number"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={speed}
                        onChange={e => setSpeed(parseFloat(e.target.value))}
                        className="bg-zinc-950/50 border-zinc-800/50 text-zinc-300 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-blue-500/20 blur-xl rounded-xl" />
                    <button
                      onClick={createTask}
                      disabled={
                        (activeTab === 'text' && (!text.trim() || isOverLimit)) ||
                        (activeTab === 'file' && !fileId)
                      }
                      className={`relative w-full py-4 rounded-xl font-semibold text-base transition-all duration-300 ${
                        (activeTab === 'text' && (!text.trim() || isOverLimit)) ||
                        (activeTab === 'file' && !fileId)
                          ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98]'
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
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="font-semibold text-zinc-100">任务列表</div>
                </div>
                <div className="text-xs text-zinc-500">
                  {tasks.length} 个任务
                </div>
              </div>

              <div className="p-6 max-h-[800px] overflow-y-auto task-scrollbar">
                {tasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-zinc-500"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center">
                        <Volume2 className="w-10 h-10 text-zinc-600" />
                      </div>
                    </div>
                    <p className="mt-6 text-lg font-medium text-zinc-400">暂无任务</p>
                    <p className="text-sm text-zinc-600 mt-2">
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
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 blur-xl rounded-2xl animate-pulse" />
                          )}

                          <div
                            className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                              task.status === 'completed'
                                ? 'bg-zinc-900/80 border-teal-500/30'
                                : task.status === 'processing'
                                  ? 'bg-zinc-900/80 border-cyan-500/40'
                                  : task.status === 'failed'
                                    ? 'bg-zinc-900/80 border-rose-500/30'
                                    : 'bg-zinc-900/60 border-zinc-800/50'
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
                                      <span className="font-mono text-sm text-zinc-300">
                                        {task.taskId.slice(0, 8)}...
                                      </span>
                                      {getStatusBadge(task.status)}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                      {new Date(task.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeTask(task.taskId)}
                                  className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="relative">
                                <div
                                  className={`absolute inset-0 rounded-lg opacity-10 ${
                                    task.status === 'completed'
                                      ? 'bg-teal-500'
                                      : task.status === 'processing'
                                        ? 'bg-cyan-500'
                                        : task.status === 'failed'
                                          ? 'bg-rose-500'
                                          : 'bg-zinc-500'
                                  }`}
                                />
                                <p className="relative p-3 text-sm text-zinc-400 line-clamp-2">
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
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 border border-teal-500/30 text-teal-300 rounded-lg transition-all duration-200 group/btn"
                                  >
                                    <Download
                                      className="w-4 h-4 group-hover/btn:animate-bounce"
                                    />
                                    <span className="font-medium">
                                      下载音频
                                      {task.result.audioLength > 0 && (
                                        <span className="text-teal-400/70 ml-1">
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
                                      className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 text-zinc-300 rounded-lg transition-all duration-200"
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
                                  className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg"
                                >
                                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                  <p className="text-sm text-rose-300">{task.error}</p>
                                </motion.div>
                              )}

                              {task.status === 'processing' && (
                                <div className="flex items-center gap-2 text-xs text-cyan-400">
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
