import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ResourceReferenceCard } from '@/components/resources/ResourceReferenceCard'
import { createAsyncVoice, getAsyncVoiceStatus } from '@/lib/api/voice'
import {
  mergeResourceUsageMetadata,
  upsertResourceReference,
  type ResourceReference,
} from '@/lib/resource-references'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import {
  VOICE_OPTIONS,
  type T2AAsyncStatusResponse,
} from '@/types'
import { VoiceAsyncForm } from './VoiceAsyncForm'
import { VoiceAsyncHeader } from './VoiceAsyncHeader'
import { VoiceHistory } from './VoiceHistory'
import { useVoiceAsyncUpload } from './useVoiceAsyncUpload'
import { buildVoiceAsyncCurl, containerVariants, saveVoiceAsyncToMedia } from './voiceAsyncHelpers'
import type { Task, TaskStatus, VoiceFormData } from './types'

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
  const [resourceReferences, setResourceReferences] = useState<readonly ResourceReference[]>([])
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

  const uploadState = useVoiceAsyncUpload({
    onUploaded: (fileId) => setFormData(prev => ({ ...prev, fileId })),
  })

  const trackResourceReference = (reference: ResourceReference) => {
    setResourceReferences(current => upsertResourceReference(current, reference))
  }

  const handleClearAll = () => {
    setFormData({
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
    uploadState.resetUpload()
    setResourceReferences([])
  }

  const generateCurl = () => buildVoiceAsyncCurl(formData)

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
        resourceReferences,
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
          const metadata = mergeResourceUsageMetadata({
            taskId,
            model: formData.model,
            voiceId: formData.voiceId,
            audioLength: status.results.audio_length,
          }, task.resourceReferences)
          addItem({
            type: 'voice',
            input: task.text,
            outputUrl: status.results.audio_url,
            metadata,
          })
          
          saveVoiceAsyncToMedia(status.results.audio_url, `voice_async_${Date.now()}.wav`, 'voice_async', metadata)
        } else if (status.status === 'failed') {
          newTask.error = '生成失败'
        }

        return newTask
      })
    )
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
      <VoiceAsyncHeader generateCurl={generateCurl} onClear={handleClearAll} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ResourceReferenceCard
            generationType="voice"
            onApplyTemplate={({ content, reference }) => {
              handleFormChange({ text: content, activeTab: 'text' })
              trackResourceReference(reference)
            }}
            onApplyWorkflow={({ reference }) => trackResourceReference(reference)}
          />
          <VoiceAsyncForm
            formData={formData}
            onFormChange={handleFormChange}
            onCreateTask={createTask}
            uploadError={uploadState.uploadError}
            uploadRetryCount={uploadState.uploadRetryCount}
            pendingFile={uploadState.pendingFile}
            isDragging={uploadState.isDragging}
            onFileUpload={uploadState.handleFileUpload}
            onDrop={uploadState.handleDrop}
            onDragOver={uploadState.handleDragOver}
            onDragLeave={uploadState.handleDragLeave}
            onRetryUpload={uploadState.handleRetryUpload}
            onClearUploadError={uploadState.clearUploadError}
            fileInputRef={uploadState.fileInputRef}
            charCount={charCount}
            isOverLimit={isOverLimit}
          />
        </div>
        <VoiceHistory
          tasks={tasks}
          onRemoveTask={removeTask}
          onDownload={handleDownload}
        />
      </div>
    </motion.div>
  )
}
