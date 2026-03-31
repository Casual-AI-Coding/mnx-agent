import { useState, useRef } from 'react'
import { FileText, Upload, Clock, Download, CheckCircle, XCircle, AlertCircle, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { RetryableError } from '@/components/shared/RetryableError'
import { createAsyncVoice, getAsyncVoiceStatus } from '@/lib/api/voice'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useRetry } from '@/hooks/useRetry'
import { SPEECH_MODELS, VOICE_OPTIONS, EMOTIONS, type SpeechModel, type Emotion, type T2AAsyncStatusResponse, type T2AAsyncCreateResponse } from '@/types'

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
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()
  const { execute: executeWithRetry, retryCount, lastError, reset: resetRetry } = useRetry<T2AAsyncCreateResponse>()

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS

  const createTask = async () => {
    if (activeTab === 'text' && (!text.trim() || isOverLimit)) return
    if (activeTab === 'file' && !fileId) return

    setError(null)
    resetRetry()

    const response = await executeWithRetry(() => createAsyncVoice({
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
    }))

    if (response) {
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
    } else if (lastError) {
      setError(lastError.message)
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
      }
    }, 3000)
  }

  const updateTaskStatus = (taskId: string, status: T2AAsyncStatusResponse) => {
    setTasks(prev => prev.map(task => {
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
      } else if (status.status === 'failed') {
        newTask.error = '生成失败'
      }

      return newTask
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.zip')) {
      alert('仅支持 .txt 和 .zip 文件')
      return
    }

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
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const data = await response.json()
      setFileId(data.file_id)
    } catch (err) {
      alert('文件上传失败')
    }
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

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">等待中</Badge>
      case 'processing':
        return <Badge variant="default">处理中</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">已完成</Badge>
      case 'failed':
        return <Badge variant="destructive">失败</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">异步语音生成</h1>
          <p className="text-muted-foreground text-sm">
            支持长文本（最大 {MAX_CHARS.toLocaleString()} 字符）或文件输入，任务完成后可下载音频文件
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                输入
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">文本输入</TabsTrigger>
                  <TabsTrigger value="file">文件上传</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`输入要转换为语音的文本（最大 ${MAX_CHARS.toLocaleString()} 字符）...`}
                    className="min-h-[200px] resize-none"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
                      {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} 字符
                    </span>
                    {isOverLimit && (
                      <Badge variant="destructive">超出限制</Badge>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">点击上传文件</p>
                    <p className="text-xs text-muted-foreground">支持 .txt 和 .zip 格式</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.zip"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  {fileId && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700">文件已上传: {fileId}</span>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>参数设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">模型</label>
                  <Select value={model} onValueChange={(v) => setModel(v as SpeechModel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEECH_MODELS.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">音色</label>
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">情绪</label>
                  <Select value={emotion} onValueChange={(v) => setEmotion(v as Emotion)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOTIONS.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          <span className="mr-2">{e.emoji}</span>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">语速 ({speed.toFixed(1)}x)</label>
                  <Input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <Button
                onClick={createTask}
                disabled={
                  (activeTab === 'text' && (!text.trim() || isOverLimit)) ||
                  (activeTab === 'file' && !fileId)
                }
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                创建任务
              </Button>

              {error && (
                <RetryableError
                  error={error}
                  onRetry={createTask}
                  retryCount={retryCount}
                  maxRetries={3}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                任务列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无任务</p>
                  <p className="text-sm">创建任务后将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.taskId}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="font-medium text-sm">{task.taskId.slice(0, 8)}...</span>
                          {getStatusBadge(task.status)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(task.taskId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.text.slice(0, 100)}{task.text.length > 100 ? '...' : ''}
                      </p>

                      {task.status === 'completed' && task.result && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(task.result!.audioUrl, `audio-${task.taskId}.mp3`)}
                            className="flex-1"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            下载音频
                          </Button>
                          {task.result.subtitleUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(task.result!.subtitleUrl!, `subtitle-${task.taskId}.srt`)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              字幕
                            </Button>
                          )}
                        </div>
                      )}

                      {task.error && (
                        <p className="text-sm text-destructive">{task.error}</p>
                      )}

                      <div className="text-xs text-muted-foreground">
                        创建时间: {new Date(task.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
