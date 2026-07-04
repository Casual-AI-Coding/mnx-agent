import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { createVideo, getVideoStatus } from '@/lib/api/video'
import { uploadMediaFromUrl } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { DEFAULT_MODELS, type VideoModel, type CameraCommand } from '@/types'
import { mergeResourceUsageMetadata, upsertResourceReference, type ResourceReference } from '@/lib/resource-references'
import { useFormPersistence, FORM_PERSISTENCE_KEYS } from '@/hooks/useFormPersistence'
import { VideoGenerationFormPanel } from './VideoGeneration/VideoGenerationFormPanel.js'
import { VideoGenerationHeader } from './VideoGeneration/VideoGenerationHeader.js'
import { VideoTaskList } from './VideoGeneration/VideoTaskList.js'

export type TaskStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoTask {
  id: string
  taskId: string
  status: TaskStatus
  prompt: string
  createdAt: number
  videoUrl?: string
  duration?: number
  error?: string
  resourceReferences: readonly ResourceReference[]
}

export interface VideoGenerationFormData {
  [key: string]: unknown
  prompt: string
  model: VideoModel
  cameraCommand: CameraCommand
}

export default function VideoGeneration() {
  const { t } = useTranslation()
  const videoSettings = useSettingsStore(s => s.settings.generation.video)
  
  const [formData, setFormData] = useFormPersistence<VideoGenerationFormData>({
    storageKey: FORM_PERSISTENCE_KEYS.VIDEO_GENERATION,
    defaultValue: {
      prompt: '',
      model: (videoSettings?.model as VideoModel) || DEFAULT_MODELS.video,
      cameraCommand: 'static',
    },
  })
  
  const { prompt, model, cameraCommand } = formData
  
  const updateForm = (updates: Partial<VideoGenerationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<VideoTask[]>([])
  const [resourceReferences, setResourceReferences] = useState<readonly ResourceReference[]>([])
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const trackResourceReference = (reference: ResourceReference) => {
    setResourceReferences(current => upsertResourceReference(current, reference))
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await createVideo({
        model,
        prompt: prompt.trim(),
        ...(cameraCommand !== 'static' && { camera_control: { type: cameraCommand } }),
      })

      const newTask: VideoTask = {
        id: response.task_id,
        taskId: response.task_id,
        status: 'pending',
        prompt: prompt.trim(),
        createdAt: Date.now(),
        resourceReferences,
      }

      setTasks(prev => [newTask, ...prev])
      updateForm({ prompt: '' })

      addUsage('videoRequests', 1)

      pollTaskStatus(newTask.taskId)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('videoGeneration.videoGenFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  const pollTaskStatus = async (taskId: string) => {
    let attempts = 0
    const maxAttempts = 120

    const interval = setInterval(async () => {
      attempts++
      try {
        const status = await getVideoStatus(taskId)

        setTasks(prev => prev.map(task => {
          if (task.taskId !== taskId) return task

          const updatedTask: VideoTask = {
            ...task,
            status: status.status as TaskStatus,
          }

          if (status.status === 'completed' && status.results) {
            updatedTask.videoUrl = status.results.video_url
            updatedTask.duration = status.results.duration

            addItem({
              type: 'video',
              input: task.prompt,
              outputUrl: status.results.video_url,
              metadata: mergeResourceUsageMetadata({
                taskId,
                model,
                duration: status.results.duration,
              }, task.resourceReferences),
            })

            saveVideoToMedia(status.results.video_url, task.resourceReferences)
          } else if (status.status === 'failed') {
            updatedTask.error = status.error || t('videoGeneration.failed')
          }

          return updatedTask
        }))

        if (status.status === 'completed' || status.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 5000)
  }

  const saveVideoToMedia = async (
    videoUrl: string,
    references: readonly ResourceReference[]
  ): Promise<void> => {
    try {
      await uploadMediaFromUrl(
        videoUrl,
        `video_${Date.now()}.mp4`,
        'video',
        'video_generation',
        mergeResourceUsageMetadata({ source_url: videoUrl, saved_at: new Date().toISOString() }, references)
      )
    } catch (error) {
      console.error('Failed to save video:', error)
    }
  }

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId))
  }

  const generateCurl = () => {
    const payload = {
      model,
      prompt: prompt.trim() || 'your prompt here',
      camera_control: cameraCommand !== 'static' ? { type: cameraCommand } : undefined,
    }
    return `curl -X POST https://api.minimaxi.com/api/video-generation/create \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $MINIMAX_API_KEY" \\\n  -d '${JSON.stringify(payload, null, 2)}'`
  }

  const clearAll = () => {
    updateForm({
      prompt: '',
      model: DEFAULT_MODELS.video,
      cameraCommand: 'static',
    })
    setResourceReferences([])
  }

  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="视频生成加载失败"
          message="视频生成页面渲染时遇到错误，请稍后重试或刷新页面。"
          onRetry={() => window.location.reload()}
          className="min-h-[50vh]"
        />
      }
    >
      <div className="space-y-6">
        <VideoGenerationHeader generateCurl={generateCurl} onClear={clearAll} />
        <VideoGenerationFormPanel
          formData={formData}
          isGenerating={isGenerating}
          error={error}
          onFormChange={updateForm}
          onGenerate={handleGenerate}
          onTrackResourceReference={trackResourceReference}
        />

        <div className="space-y-4">
          <VideoTaskList tasks={tasks} onRemoveTask={removeTask} />
        </div>
      </div>
    </ErrorBoundary>
  )
}
