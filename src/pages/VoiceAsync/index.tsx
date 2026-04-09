import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { useSettingsStore } from '@/settings/store'
import { createAsyncVoice, getAsyncVoiceStatus } from '@/lib/api/voice'
import { uploadMedia, type MediaSource } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import {
  VOICE_OPTIONS,
  type T2AAsyncStatusResponse,
} from '@/types'
import { VoiceAsyncForm } from './VoiceAsyncForm'
import { VoiceHistory } from './VoiceHistory'
import type { Task, TaskStatus, VoiceFormData } from './types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
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
  const [formData, setFormData] = useState<VoiceFormData>({
    text: '',
    model: 'speech-2.6-hd',
    voiceId: VOICE_OPTIONS[0].id,
    emotion: 'auto',
    speed: 1.0,
    volume: 1.0,
    pitch: 0,
    activeTab: 'text',
    fileId: null,
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadRetryCount, setUploadRetryCount] = useState(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingIntervalsRef = useRef<NodeJS.Timeout[]>([])
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const charCount = formData.text.length
  const isOverLimit = charCount > 50000

  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach(clearInterval)
      pollingIntervalsRef.current = []
    }
  }, [])

  const handleFormChange = (data: Partial<VoiceFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const createTask = async () => {
    if (formData.activeTab === 'text' && (!formData.text.trim() || isOverLimit)) return
    if (formData.activeTab === 'file' && !formData.fileId) return

    try {
      const response = await createAsyncVoice({
        model: formData.model,
        text: formData.activeTab === 'text' ? formData.text.trim() : undefined,
        file_id: formData.activeTab === 'file' ? (formData.fileId ?? undefined) : undefined,
        voice_setting: {
          voice_id: formData.voiceId,
          speed: formData.speed,
          vol: formData.volume,
          pitch: formData.pitch,
          emotion: formData.emotion,
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
        text: formData.activeTab === 'text' ? formData.text.trim() : (formData.fileId ? '文件任务' : ''),
        createdAt: Date.now(),
      }

      setTasks(prev => [newTask, ...prev])

      if (formData.activeTab === 'text') {
        addUsage('voiceCharacters', formData.text.length)
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
              model: formData.model,
              voiceId: formData.voiceId,
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
    
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

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
        body: formDataUpload,
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, fileId: data.file_id }))
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
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

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId))
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
        <VoiceAsyncForm
          formData={formData}
          onFormChange={handleFormChange}
          onCreateTask={createTask}
          uploadError={uploadError}
          uploadRetryCount={uploadRetryCount}
          pendingFile={pendingFile}
          isDragging={isDragging}
          onFileUpload={handleFileUpload}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onRetryUpload={handleRetryUpload}
          onClearUploadError={clearUploadError}
          fileInputRef={fileInputRef}
          charCount={charCount}
          isOverLimit={isOverLimit}
        />
        <VoiceHistory
          tasks={tasks}
          onRemoveTask={removeTask}
          onDownload={handleDownload}
        />
      </div>
    </motion.div>
  )
}
